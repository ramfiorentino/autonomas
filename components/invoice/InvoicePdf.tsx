import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import type { Invoice } from "@/lib/types/invoice";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    padding: 48,
    backgroundColor: "#FFFFFF",
    color: "#1C1917",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  wordmark: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#2D6A4F",
    letterSpacing: 1,
  },
  invoiceLabel: {
    fontSize: 20,
    fontFamily: "Helvetica-Bold",
    color: "#1C1917",
  },
  invoiceNumber: {
    fontSize: 12,
    color: "#78716C",
    marginTop: 2,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#78716C",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  twoCol: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
  },
  col: {
    flex: 1,
  },
  name: {
    fontFamily: "Helvetica-Bold",
    fontSize: 11,
    marginBottom: 2,
  },
  text: {
    color: "#44403C",
    lineHeight: 1.5,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E7E5E4",
    marginVertical: 16,
  },
  table: {
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E7E5E4",
    paddingBottom: 4,
    marginBottom: 6,
  },
  tableHeaderText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#78716C",
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  colDesc: { flex: 3 },
  colAmt: { flex: 1, textAlign: "right" },
  totalsBlock: {
    alignItems: "flex-end",
    marginTop: 8,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 32,
    paddingVertical: 2,
    minWidth: 200,
  },
  totalLabel: {
    color: "#78716C",
    width: 120,
    textAlign: "right",
  },
  totalValue: {
    width: 80,
    textAlign: "right",
  },
  grandTotalRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 32,
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: "#1C1917",
    marginTop: 4,
    minWidth: 200,
  },
  grandTotalLabel: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    width: 120,
    textAlign: "right",
  },
  grandTotalValue: {
    fontFamily: "Helvetica-Bold",
    fontSize: 12,
    width: 80,
    textAlign: "right",
    color: "#2D6A4F",
  },
  dates: {
    flexDirection: "row",
    gap: 24,
    marginTop: 32,
  },
  dateLabel: {
    fontSize: 8,
    color: "#78716C",
    textTransform: "uppercase",
  },
  dateValue: {
    fontFamily: "Helvetica-Bold",
    marginTop: 2,
  },
});

function fmt(amount: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

interface InvoicePdfProps {
  invoice: Invoice;
}

export function InvoicePdf({ invoice }: InvoicePdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.wordmark}>AUTONOMAS</Text>
          <View>
            <Text style={styles.invoiceLabel}>
              {invoice.rectificaRef ? "FACTURA RECTIFICATIVA" : "FACTURA"}
            </Text>
            <Text style={styles.invoiceNumber}>{invoice.number}</Text>
          </View>
        </View>

        {/* Issuer & Client */}
        <View style={[styles.section, styles.twoCol]}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Emisor</Text>
            <Text style={styles.name}>{invoice.issuerName}</Text>
            <Text style={styles.text}>{invoice.issuerNif}</Text>
            <Text style={styles.text}>{invoice.issuerAddress}</Text>
          </View>
          {!invoice.simplificada && (
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Cliente</Text>
              <Text style={styles.name}>{invoice.client.name}</Text>
              {invoice.client.nif ? (
                <Text style={styles.text}>{invoice.client.nif}</Text>
              ) : null}
              {invoice.client.address ? (
                <Text style={styles.text}>{invoice.client.address}</Text>
              ) : null}
            </View>
          )}
          {invoice.simplificada && (
            <View style={styles.col}>
              <Text style={styles.sectionTitle}>Cliente</Text>
              <Text style={styles.name}>{invoice.client.name}</Text>
              <Text style={styles.text}>Factura simplificada</Text>
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Rectificativa reference */}
        {invoice.rectificaRef && invoice.correctionReason && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Motivo de la rectificación</Text>
            <Text style={styles.text}>{invoice.correctionReason}</Text>
          </View>
        )}

        {/* Service table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colDesc]}>Descripción</Text>
            <Text style={[styles.tableHeaderText, styles.colAmt]}>Importe</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.text, styles.colDesc]}>{invoice.line.description}</Text>
            <Text style={[styles.text, styles.colAmt]}>{fmt(invoice.line.amount)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Base imponible</Text>
            <Text style={styles.totalValue}>{fmt(invoice.line.amount)}</Text>
          </View>

          {invoice.ivaType === "exempt" ? (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA</Text>
              <Text style={styles.totalValue}>Exento — Art. 20 LIVA</Text>
            </View>
          ) : (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA ({invoice.ivaRate}%)</Text>
              <Text style={styles.totalValue}>{fmt(invoice.ivaAmount)}</Text>
            </View>
          )}

          {invoice.irpfAmount > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IRPF ({invoice.irpfRate}%)</Text>
              <Text style={styles.totalValue}>−{fmt(invoice.irpfAmount)}</Text>
            </View>
          )}

          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Total</Text>
            <Text style={styles.grandTotalValue}>{fmt(invoice.total)}</Text>
          </View>
        </View>

        {/* Dates */}
        <View style={styles.dates}>
          <View>
            <Text style={styles.dateLabel}>Fecha de emisión</Text>
            <Text style={styles.dateValue}>{fmtDate(invoice.issueDate)}</Text>
          </View>
          {invoice.paidAt && (
            <View>
              <Text style={styles.dateLabel}>Fecha de cobro</Text>
              <Text style={styles.dateValue}>{fmtDate(invoice.paidAt)}</Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
