from io import BytesIO
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
from reportlab.lib.enums import TA_RIGHT, TA_CENTER
from django.conf import settings

BRAND_BLUE = colors.HexColor('#1a3a5c')
BRAND_LIGHT = colors.HexColor('#e8f0f7')
TEXT_GRAY = colors.HexColor('#555555')
BORDER_GRAY = colors.HexColor('#dddddd')


def generate_invoice_pdf(invoice):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4,
                            rightMargin=15*mm, leftMargin=15*mm,
                            topMargin=15*mm, bottomMargin=15*mm)

    normal = ParagraphStyle('n', fontSize=9, textColor=TEXT_GRAY, fontName='Helvetica', leading=14)
    small = ParagraphStyle('s', fontSize=8, textColor=TEXT_GRAY, fontName='Helvetica')
    story = []

    # Header
    header = Table([[
        Paragraph(f"<b>{settings.COMPANY_NAME}</b>",
                  ParagraphStyle('ct', fontSize=14, textColor=BRAND_BLUE, fontName='Helvetica-Bold')),
        Paragraph("INVOICE",
                  ParagraphStyle('it', fontSize=22, textColor=BRAND_BLUE, fontName='Helvetica-Bold', alignment=TA_RIGHT)),
    ]], colWidths=[100*mm, 80*mm])
    header.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'MIDDLE'), ('BOTTOMPADDING', (0,0), (-1,-1), 8)]))
    story.append(header)

    # Company + Invoice meta
    company_text = (f"{settings.COMPANY_ADDRESS}<br/>{settings.COMPANY_CITY}<br/>"
                    f"Tax: {settings.COMPANY_TAX_NUMBER}<br/>{settings.COMPANY_EMAIL}")
    meta_text = (f"<b>Invoice:</b> {invoice.invoice_number}<br/>"
                 f"<b>Date:</b> {invoice.invoice_date.strftime('%d %b %Y')}<br/>"
                 f"<b>Due:</b> {invoice.due_date.strftime('%d %b %Y')}<br/>"
                 f"<b>Status:</b> {invoice.get_status_display()}")
    info = Table([[
        Paragraph(company_text, normal),
        Paragraph(meta_text, ParagraphStyle('m', fontSize=9, textColor=TEXT_GRAY,
                                             fontName='Helvetica', alignment=TA_RIGHT, leading=16)),
    ]], colWidths=[100*mm, 80*mm])
    info.setStyle(TableStyle([('VALIGN', (0,0), (-1,-1), 'TOP'), ('BOTTOMPADDING', (0,0), (-1,-1), 8)]))
    story.append(info)
    story.append(HRFlowable(width="100%", thickness=1, color=BRAND_BLUE))
    story.append(Spacer(1, 8*mm))

    # Bill To
    c = invoice.customer
    bill = (f"<b>Bill To</b><br/>{c.company_name}<br/>{c.address or ''}<br/>"
            f"{c.city or ''}{', ' + c.country if c.country else ''}<br/>"
            f"{'Tax: ' + c.tax_number if c.tax_number else ''}")
    story.append(Table([[Paragraph(bill, normal)]], colWidths=[180*mm]))
    story.append(Spacer(1, 8*mm))

    # Line items
    rows = [['Description', 'Qty', 'Unit Price', 'Amount']]
    for item in invoice.items.all():
        qty = int(item.quantity) if item.quantity == int(item.quantity) else item.quantity
        rows.append([Paragraph(item.description, small), str(qty),
                     f"${item.unit_price:,.2f}", f"${item.amount:,.2f}"])
    items_tbl = Table(rows, colWidths=[100*mm, 20*mm, 30*mm, 30*mm])
    items_tbl.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), BRAND_BLUE),
        ('TEXTCOLOR', (0,0), (-1,0), colors.white),
        ('FONTNAME', (0,0), (-1,0), 'Helvetica-Bold'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, BRAND_LIGHT]),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_GRAY),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (0,-1), 8),
    ]))
    story.append(items_tbl)
    story.append(Spacer(1, 8*mm))

    # Totals
    totals = [['', 'Subtotal:', f"${invoice.subtotal:,.2f}"]]
    if invoice.tax_rate > 0:
        totals.append(['', f"Tax ({invoice.tax_rate}%):", f"${invoice.tax_amount:,.2f}"])
    totals.append(['', 'TOTAL:', f"${invoice.total:,.2f}"])
    if invoice.amount_paid > 0:
        totals.append(['', 'Amount Paid:', f"${invoice.amount_paid:,.2f}"])
        totals.append(['', 'Balance Due:', f"${invoice.balance_due:,.2f}"])
    total_row = 2 if invoice.tax_rate > 0 else 1
    totals_tbl = Table(totals, colWidths=[100*mm, 50*mm, 30*mm])
    totals_tbl.setStyle(TableStyle([
        ('ALIGN', (1,0), (-1,-1), 'RIGHT'),
        ('FONTSIZE', (0,0), (-1,-1), 9),
        ('TEXTCOLOR', (1,0), (-1,-1), TEXT_GRAY),
        ('FONTNAME', (1,total_row), (-1,total_row), 'Helvetica-Bold'),
        ('FONTSIZE', (1,total_row), (-1,total_row), 11),
        ('TEXTCOLOR', (1,total_row), (-1,total_row), BRAND_BLUE),
        ('LINEABOVE', (1,total_row), (-1,total_row), 1, BRAND_BLUE),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
    ]))
    story.append(totals_tbl)

    if invoice.notes:
        story.append(Spacer(1, 8*mm))
        story.append(Paragraph(f"<b>Notes:</b> {invoice.notes}", normal))

    story.append(Spacer(1, 15*mm))
    story.append(HRFlowable(width="100%", thickness=0.5, color=BORDER_GRAY))
    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        f"Thank you for your business — {settings.COMPANY_NAME} | {settings.COMPANY_EMAIL}",
        ParagraphStyle('foot', fontSize=8, textColor=TEXT_GRAY, fontName='Helvetica', alignment=TA_CENTER)
    ))

    doc.build(story)
    buffer.seek(0)
    return buffer
