import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Heading,
  Text,
  Button,
  Hr,
  Link,
} from "@react-email/components";
import type { TaxDeadline } from "@/lib/tax-deadlines";

export interface MonthlyReminderProps {
  locale: "es" | "en";
  /** User's first name or full name for greeting */
  name?: string;
  /** Pre-signed unsubscribe URL */
  unsubscribeUrl: string;
  /** If provided, renders the deadline alert section */
  deadline?: TaxDeadline & { daysRemaining: number };
}

const APP_URL = "https://autonomas.app";

const COPY = {
  es: {
    subject: (deadline?: MonthlyReminderProps["deadline"]) =>
      deadline
        ? `Autonomas — Plazo Modelo 130: ${formatDateEs(deadline.date)}`
        : "Autonomas — ¿Tienes tus facturas al día?",
    greeting: (name?: string) =>
      name ? `Hola, ${name.split(" ")[0]}` : "Hola",
    deadlineTitle: "⚠️ Plazo Modelo 130 próximo",
    deadlineBody: (d: NonNullable<MonthlyReminderProps["deadline"]>) =>
      `El plazo del ${d.label} vence el ${formatDateEs(d.date)}. Te quedan ${d.daysRemaining} días para presentarlo.`,
    reminderTitle: "Recordatorio mensual",
    reminderBody:
      "Recuerda revisar tus facturas y registrar los gastos del mes pasado. Mantener las cuentas al día te ahorra horas de trabajo antes de cada plazo trimestral.",
    ctaLabel: "Abrir Autonomas",
    unsubscribeText: "¿No quieres recibir más recordatorios? ",
    unsubscribeLink: "Darse de baja",
    footer:
      "Autonomas · Tu gestión financiera, sin complicaciones · autonomas.app",
  },
  en: {
    subject: (deadline?: MonthlyReminderProps["deadline"]) =>
      deadline
        ? `Autonomas — Modelo 130 deadline: ${formatDateEn(deadline.date)}`
        : "Autonomas — Are your invoices up to date?",
    greeting: (name?: string) =>
      name ? `Hi, ${name.split(" ")[0]}` : "Hi there",
    deadlineTitle: "⚠️ Upcoming Modelo 130 deadline",
    deadlineBody: (d: NonNullable<MonthlyReminderProps["deadline"]>) =>
      `The ${d.label} deadline is ${formatDateEn(d.date)}. You have ${d.daysRemaining} days left to file.`,
    reminderTitle: "Monthly reminder",
    reminderBody:
      "Remember to review your invoices and log last month's expenses. Keeping your books up to date saves hours before each quarterly deadline.",
    ctaLabel: "Open Autonomas",
    unsubscribeText: "Don't want these reminders? ",
    unsubscribeLink: "Unsubscribe",
    footer:
      "Autonomas · Your financial management, simplified · autonomas.app",
  },
} as const;

export function MonthlyReminder({
  locale,
  name,
  unsubscribeUrl,
  deadline,
}: MonthlyReminderProps) {
  const c = COPY[locale];

  return (
    <Html lang={locale}>
      <Head />
      <Body
        style={{
          backgroundColor: "#f9fafb",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
          margin: 0,
          padding: 0,
        }}
      >
        <Container
          style={{
            maxWidth: "560px",
            margin: "40px auto",
            backgroundColor: "#ffffff",
            borderRadius: "12px",
            overflow: "hidden",
            border: "1px solid #e5e7eb",
          }}
        >
          {/* Header */}
          <Section
            style={{
              backgroundColor: "#7c3aed",
              padding: "24px 32px",
            }}
          >
            <Heading
              style={{
                color: "#ffffff",
                fontSize: "20px",
                fontWeight: "700",
                margin: 0,
              }}
            >
              Autonomas
            </Heading>
          </Section>

          {/* Body */}
          <Section style={{ padding: "32px" }}>
            <Text
              style={{
                fontSize: "16px",
                color: "#111827",
                fontWeight: "600",
                marginBottom: "8px",
                marginTop: 0,
              }}
            >
              {c.greeting(name)}
            </Text>

            {/* Deadline alert — conditional */}
            {deadline && (
              <Section
                style={{
                  backgroundColor: "#fef3c7",
                  border: "1px solid #f59e0b",
                  borderRadius: "8px",
                  padding: "16px 20px",
                  marginBottom: "24px",
                }}
              >
                <Text
                  style={{
                    fontSize: "14px",
                    fontWeight: "700",
                    color: "#92400e",
                    margin: "0 0 6px 0",
                  }}
                >
                  {c.deadlineTitle}
                </Text>
                <Text
                  style={{
                    fontSize: "14px",
                    color: "#78350f",
                    margin: 0,
                  }}
                >
                  {c.deadlineBody(deadline)}
                </Text>
              </Section>
            )}

            {/* Standard reminder */}
            <Heading
              as="h2"
              style={{
                fontSize: "16px",
                fontWeight: "600",
                color: "#111827",
                marginBottom: "8px",
                marginTop: 0,
              }}
            >
              {c.reminderTitle}
            </Heading>
            <Text
              style={{
                fontSize: "14px",
                color: "#374151",
                lineHeight: "1.6",
                margin: "0 0 24px 0",
              }}
            >
              {c.reminderBody}
            </Text>

            {/* CTA */}
            <Button
              href={APP_URL}
              style={{
                backgroundColor: "#7c3aed",
                color: "#ffffff",
                padding: "12px 24px",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: "600",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {c.ctaLabel}
            </Button>
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: "#e5e7eb", margin: 0 }} />
          <Section style={{ padding: "16px 32px" }}>
            <Text
              style={{
                fontSize: "12px",
                color: "#9ca3af",
                margin: "0 0 4px 0",
              }}
            >
              {c.footer}
            </Text>
            <Text style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
              {c.unsubscribeText}
              <Link
                href={unsubscribeUrl}
                style={{ color: "#6b7280", textDecoration: "underline" }}
              >
                {c.unsubscribeLink}
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

/**
 * Generates the email subject line for external use (e.g. in the cron handler).
 */
export function getEmailSubject(
  locale: "es" | "en",
  deadline?: MonthlyReminderProps["deadline"],
): string {
  return COPY[locale].subject(deadline);
}

/**
 * Plain-text fallback for both variants and both locales.
 */
export function getPlainText(
  locale: "es" | "en",
  name: string | undefined,
  unsubscribeUrl: string,
  deadline?: MonthlyReminderProps["deadline"],
): string {
  const c = COPY[locale];
  const lines: string[] = [];

  lines.push(c.greeting(name));
  lines.push("");

  if (deadline) {
    lines.push(c.deadlineTitle);
    lines.push(c.deadlineBody(deadline));
    lines.push("");
  }

  lines.push(c.reminderTitle);
  lines.push(c.reminderBody);
  lines.push("");
  lines.push(`${c.ctaLabel}: ${APP_URL}`);
  lines.push("");
  lines.push("---");
  lines.push(c.footer);
  lines.push(`${c.unsubscribeText}${unsubscribeUrl}`);

  return lines.join("\n");
}

// ── Date formatting helpers ───────────────────────────────────────────────────

function formatDateEs(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  const months = [
    "", "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
  ];
  return `${parseInt(day)} de ${months[parseInt(month)]}`;
}

function formatDateEn(isoDate: string): string {
  const [, month, day] = isoDate.split("-");
  const months = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return `${months[parseInt(month)]} ${parseInt(day)}`;
}
