import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import { formatDoseTiming, type TodaysDose } from "@/lib/schedule";
import { formatDay, formatTime } from "@/lib/timezone";

const styles = StyleSheet.create({
  page: { padding: 32, fontSize: 10, fontFamily: "Helvetica" },
  title: { fontSize: 18, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 11, color: "#555555", marginBottom: 2 },
  meta: { fontSize: 9, color: "#888888", marginBottom: 16 },
  table: { display: "flex", flexDirection: "column", borderWidth: 1, borderColor: "#dddddd" },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderBottomWidth: 1,
    borderColor: "#dddddd",
  },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#eeeeee" },
  cell: { padding: 6, fontSize: 9 },
  headerCell: { padding: 6, fontSize: 9, fontFamily: "Helvetica-Bold" },
  colDate: { width: "16%" },
  colTime: { width: "12%" },
  colMedicine: { width: "28%" },
  colDose: { width: "16%" },
  colStatus: { width: "14%" },
  colTiming: { width: "14%" },
  statusTaken: { color: "#15803d" },
  statusMissed: { color: "#b91c1c" },
  statusUpcoming: { color: "#6b7280" },
  empty: { padding: 24, textAlign: "center", color: "#888888" },
});

const STATUS_LABEL = { taken: "Taken", missed: "Missed", upcoming: "Upcoming" } as const;
const STATUS_STYLE = {
  taken: styles.statusTaken,
  missed: styles.statusMissed,
  upcoming: styles.statusUpcoming,
} as const;

type DoseWithName = TodaysDose<{
  id: string;
  name: string;
  amountPerDose: number;
  unit: string;
}>;

export function AdherenceReportDocument({
  patientName,
  periodLabel,
  medicationLabel,
  generatedAt,
  doses,
  timeZone,
}: {
  patientName: string;
  periodLabel: string;
  medicationLabel: string;
  generatedAt: Date;
  doses: DoseWithName[];
  timeZone: string;
}) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{patientName}&apos;s Adherence Report</Text>
        <Text style={styles.subtitle}>{periodLabel}</Text>
        <Text style={styles.subtitle}>{medicationLabel}</Text>
        <Text style={styles.meta}>
          Generated{" "}
          {generatedAt.toLocaleString([], { dateStyle: "medium", timeStyle: "short", timeZone })}
        </Text>

        {doses.length === 0 ? (
          <Text style={styles.empty}>No doses recorded in this period.</Text>
        ) : (
          <View style={styles.table}>
            <View style={styles.headerRow}>
              <Text style={[styles.headerCell, styles.colDate]}>Date</Text>
              <Text style={[styles.headerCell, styles.colTime]}>Time</Text>
              <Text style={[styles.headerCell, styles.colMedicine]}>Medicine</Text>
              <Text style={[styles.headerCell, styles.colDose]}>Dose</Text>
              <Text style={[styles.headerCell, styles.colStatus]}>Status</Text>
              <Text style={[styles.headerCell, styles.colTiming]}>Punctuality</Text>
            </View>
            {doses.map((dose, index) => (
              <View key={index} style={styles.row} wrap={false}>
                <Text style={[styles.cell, styles.colDate]}>
                  {formatDay(dose.scheduledFor, timeZone, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Text>
                <Text style={[styles.cell, styles.colTime]}>
                  {formatTime(dose.scheduledFor, timeZone)}
                </Text>
                <Text style={[styles.cell, styles.colMedicine]}>
                  {dose.medication.name}
                </Text>
                <Text style={[styles.cell, styles.colDose]}>
                  {dose.medication.amountPerDose} {dose.medication.unit}
                </Text>
                <Text style={[styles.cell, styles.colStatus, STATUS_STYLE[dose.status]]}>
                  {STATUS_LABEL[dose.status]}
                </Text>
                <Text style={[styles.cell, styles.colTiming]}>
                  {dose.status === "taken" && dose.takenAt
                    ? formatDoseTiming(dose.scheduledFor, dose.takenAt)
                    : "–"}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Page>
    </Document>
  );
}
