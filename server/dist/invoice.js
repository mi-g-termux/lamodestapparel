import PDFDocument from "pdfkit";
import { query, one } from "./db.js";
import { getSettings } from "./settings.js";
import { formatMoney, CURRENCY_META } from "./fx.js";
/** Reserve (or reuse) the invoice number for an order. */
export async function ensureInvoice(orderId) {
    const existing = await one(`select number, issued_at from invoices where order_id = $1`, [orderId]);
    if (existing)
        return existing;
    const s = await getSettings();
    const prefix = String(s.orders?.invoice_prefix ?? "INV-");
    const padding = Number(s.orders?.invoice_padding ?? 5);
    const seq = await one(`select nextval('invoice_number_seq') as nextval`);
    const number = `${prefix}${String(seq?.nextval ?? 1).padStart(padding, "0")}`;
    const order = await one(`select total_minor, currency from orders where id = $1`, [orderId]);
    const row = await one(`insert into invoices (order_id, number, total_minor, currency)
     values ($1,$2,$3,$4) returning number, issued_at`, [orderId, number, order?.total_minor ?? 0, order?.currency ?? "GBP"]);
    return row ?? { number, issued_at: new Date().toISOString() };
}
export async function loadInvoiceData(orderId) {
    const order = await one(`select * from orders where id = $1`, [orderId]);
    if (!order)
        return null;
    const items = await query(`select title, variant_title, sku, qty, unit_price_minor, total_minor
       from order_items where order_id = $1 order by title`, [orderId]);
    const inv = await ensureInvoice(orderId);
    return { order, items, invoiceNumber: inv.number, issuedAt: inv.issued_at };
}
function addressLines(a) {
    if (!a)
        return [];
    const keys = ["name", "line1", "line2", "city", "region", "postcode", "country"];
    return keys.map((k) => String(a[k] ?? "").trim()).filter(Boolean);
}
/**
 * Render the invoice as a PDF buffer.
 * Uses core PDF fonts only, so it renders identically on cPanel and Vercel
 * without shipping any font files.
 */
export async function renderInvoicePdf(orderId) {
    const data = await loadInvoiceData(orderId);
    if (!data)
        return null;
    const { order, items, invoiceNumber, issuedAt } = data;
    const s = await getSettings();
    const storeName = String(s.branding?.store_name ?? "Store");
    const profile = s.store_profile ?? {};
    const base = String(s.currency?.base ?? "GBP");
    const terms = String(s.orders?.terms_on_invoice ?? "");
    const taxLabel = String(s.tax?.label ?? "Tax");
    const money = (m) => formatMoney(m, base);
    const doc = new PDFDocument({ size: "A4", margin: 48 });
    const chunks = [];
    doc.on("data", (c) => chunks.push(c));
    const done = new Promise((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
    const ink = "#111111";
    const grey = "#6b7280";
    const line = "#e5e7eb";
    const left = 48;
    const right = 547;
    // ---- header
    doc.fillColor(ink).font("Helvetica-Bold").fontSize(20).text(storeName, left, 48);
    doc.font("Helvetica").fontSize(9).fillColor(grey);
    const storeLines = [
        String(profile.legal_name ?? ""),
        String(profile.address_line1 ?? ""),
        String(profile.address_line2 ?? ""),
        [profile.city, profile.postcode].filter(Boolean).join(" "),
        String(profile.country ?? ""),
        profile.vat_number ? `VAT ${profile.vat_number}` : "",
        String(profile.email ?? ""),
    ].filter((v) => v && v.trim());
    doc.text(storeLines.join("\n"), left, 74, { width: 240 });
    doc.font("Helvetica-Bold").fontSize(16).fillColor(ink).text("INVOICE", 330, 48, { width: 217, align: "right" });
    doc.font("Helvetica").fontSize(9).fillColor(grey);
    doc.text([
        `Invoice no.   ${invoiceNumber}`,
        `Order no.     ${order.number}`,
        `Issued        ${new Date(issuedAt).toLocaleDateString("en-GB")}`,
        `Order date    ${new Date(order.placed_at).toLocaleDateString("en-GB")}`,
        `Payment       ${order.payment_status}`,
    ].join("\n"), 330, 72, { width: 217, align: "right" });
    // ---- bill to
    let y = 172;
    doc.moveTo(left, y - 12).lineTo(right, y - 12).strokeColor(line).lineWidth(1).stroke();
    doc.font("Helvetica-Bold").fontSize(9).fillColor(grey).text("BILL TO", left, y);
    doc.font("Helvetica").fontSize(10).fillColor(ink);
    const bill = addressLines(order.billing_address ?? order.shipping_address);
    doc.text([order.email, ...bill].filter(Boolean).join("\n"), left, y + 14, { width: 240 });
    const ship = addressLines(order.shipping_address);
    if (ship.length) {
        doc.font("Helvetica-Bold").fontSize(9).fillColor(grey).text("SHIP TO", 330, y, { width: 217, align: "right" });
        doc.font("Helvetica").fontSize(10).fillColor(ink).text(ship.join("\n"), 330, y + 14, { width: 217, align: "right" });
    }
    // ---- items table
    y = Math.max(doc.y, y + 90);
    const cols = { desc: left, qty: 330, unit: 390, total: 470 };
    doc.moveTo(left, y).lineTo(right, y).strokeColor(line).stroke();
    y += 10;
    doc.font("Helvetica-Bold").fontSize(9).fillColor(grey);
    doc.text("DESCRIPTION", cols.desc, y);
    doc.text("QTY", cols.qty, y, { width: 40, align: "right" });
    doc.text("UNIT", cols.unit, y, { width: 60, align: "right" });
    doc.text("AMOUNT", cols.total, y, { width: 77, align: "right" });
    y += 16;
    doc.moveTo(left, y).lineTo(right, y).strokeColor(line).stroke();
    y += 10;
    doc.font("Helvetica").fontSize(10).fillColor(ink);
    for (const it of items) {
        if (y > 690) {
            doc.addPage();
            y = 60;
        }
        const label = it.variant_title ? `${it.title}\n${it.variant_title}` : it.title;
        const h = it.variant_title ? 26 : 14;
        doc.fillColor(ink).fontSize(10).text(label, cols.desc, y, { width: 270 });
        doc.text(String(it.qty), cols.qty, y, { width: 40, align: "right" });
        doc.text(money(it.unit_price_minor), cols.unit, y, { width: 60, align: "right" });
        doc.text(money(it.total_minor), cols.total, y, { width: 77, align: "right" });
        if (it.sku)
            doc.fontSize(8).fillColor(grey).text(`SKU ${it.sku}`, cols.desc, y + h - 2, { width: 270 });
        y += h + (it.sku ? 10 : 4);
    }
    // ---- totals
    y += 6;
    doc.moveTo(330, y).lineTo(right, y).strokeColor(line).stroke();
    y += 10;
    const totalRow = (label, value, bold = false) => {
        doc.font(bold ? "Helvetica-Bold" : "Helvetica").fontSize(bold ? 12 : 10).fillColor(bold ? ink : grey);
        doc.text(label, 330, y, { width: 130, align: "right" });
        doc.fillColor(ink).text(value, cols.total, y, { width: 77, align: "right" });
        y += bold ? 20 : 16;
    };
    totalRow("Subtotal", money(order.subtotal_minor));
    if (order.discount_minor > 0) {
        totalRow(order.coupon_code ? `Discount (${order.coupon_code})` : "Discount", `-${money(order.discount_minor)}`);
    }
    if (order.shipping_minor > 0)
        totalRow("Shipping", money(order.shipping_minor));
    if (order.tax_minor > 0)
        totalRow(taxLabel, money(order.tax_minor));
    doc.moveTo(330, y - 4).lineTo(right, y - 4).strokeColor(line).stroke();
    y += 4;
    totalRow("Total", money(order.total_minor), true);
    // Paid in a different currency? Show what the customer was actually charged.
    if (order.currency !== base && order.fx_rate && order.fx_rate !== 1) {
        const dec = CURRENCY_META[order.currency]?.decimals ?? 2;
        const baseDec = CURRENCY_META[base]?.decimals ?? 2;
        const charged = Math.round((order.total_minor / 10 ** baseDec) * order.fx_rate * 10 ** dec);
        doc.font("Helvetica").fontSize(9).fillColor(grey);
        doc.text(`Charged as ${formatMoney(charged, order.currency)} at 1 ${base} = ${order.fx_rate.toFixed(4)} ${order.currency}`, 330, y, { width: 217, align: "right" });
        y += 16;
    }
    // ---- footer
    if (terms) {
        doc.font("Helvetica").fontSize(9).fillColor(grey).text(terms, left, Math.max(y + 24, 700), { width: 400 });
    }
    doc.fontSize(8).fillColor(grey).text(`${storeName} \u00b7 invoice ${invoiceNumber} \u00b7 generated ${new Date().toLocaleString("en-GB")}`, left, 790, { width: 499, align: "center" });
    doc.end();
    return done;
}
/** A printable HTML fallback (handy for previewing in the browser). */
export async function renderInvoiceHtml(orderId) {
    const data = await loadInvoiceData(orderId);
    if (!data)
        return null;
    const { order, items, invoiceNumber } = data;
    const s = await getSettings();
    const base = String(s.currency?.base ?? "GBP");
    const storeName = String(s.branding?.store_name ?? "Store");
    const esc = (v) => String(v ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    const money = (m) => formatMoney(m, base);
    return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(invoiceNumber)}</title>
<style>body{font:14px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#111;max-width:760px;margin:40px auto;padding:0 20px}
table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:8px 0;text-align:left;border-bottom:1px solid #eee}
td.r,th.r{text-align:right}.tot{font-weight:700;font-size:17px}@media print{body{margin:0}}</style></head><body>
<h1>${esc(storeName)}</h1><p><strong>Invoice ${esc(invoiceNumber)}</strong> \u00b7 Order ${esc(order.number)} \u00b7 ${new Date(order.placed_at).toLocaleDateString("en-GB")}</p>
<table><thead><tr><th>Item</th><th class="r">Qty</th><th class="r">Unit</th><th class="r">Amount</th></tr></thead><tbody>
${items
        .map((i) => `<tr><td>${esc(i.title)}${i.variant_title ? ` <small>(${esc(i.variant_title)})</small>` : ""}</td><td class="r">${i.qty}</td><td class="r">${money(i.unit_price_minor)}</td><td class="r">${money(i.total_minor)}</td></tr>`)
        .join("")}
</tbody></table>
<p class="tot" style="text-align:right">Total ${money(order.total_minor)}</p>
<script>window.print&&setTimeout(function(){window.print()},300)<\/script>
</body></html>`;
}
//# sourceMappingURL=invoice.js.map