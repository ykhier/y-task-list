import type { DigestItem, DigestPayload } from './digest-data'

function fmt(t: string) {
  return t?.slice(0, 5) ?? ''
}

const TYPE_META: Record<DigestItem['type'], { bg: string; color: string; label: string }> = {
  lecture:  { bg: '#EFF6FF', color: '#1D4ED8', label: 'הרצאה'  },
  tutorial: { bg: '#FFF7ED', color: '#C2410C', label: 'תרגול'  },
  task:     { bg: '#F0FDF4', color: '#15803D', label: 'משימה'  },
}

function timelineRows(items: DigestItem[]): string {
  if (!items.length) {
    return `
      <tr>
        <td colspan="3" style="padding:14px 0; color:#94a3b8; font-size:14px; text-align:right;">
          אין פריטים מתוזמנים למחר
        </td>
      </tr>`
  }

  return items
    .map((item, i) => {
      const { bg, color, label } = TYPE_META[item.type]
      const borderBottom = i < items.length - 1 ? 'border-bottom:1px solid #F1F5F9;' : ''
      return `
      <tr>
        <td style="padding:12px 8px 12px 0; ${borderBottom} color:#64748b; font-size:13px; white-space:nowrap; width:105px; vertical-align:middle; text-align:right;">
          ${fmt(item.time)}&nbsp;–&nbsp;${fmt(item.end_time)}
        </td>
        <td style="padding:12px 8px; ${borderBottom} color:#1e293b; font-size:14px; font-weight:500; vertical-align:middle; text-align:right;">
          ${item.title}
        </td>
        <td style="padding:12px 0 12px 8px; ${borderBottom} text-align:left; vertical-align:middle; white-space:nowrap;">
          <span style="display:inline-block; background:${bg}; color:${color}; font-size:11px; font-weight:700; padding:3px 9px; border-radius:20px;">
            ${label}
          </span>
        </td>
      </tr>`
    })
    .join('')
}

function untimedSection(tasks: string[]): string {
  if (!tasks.length) return ''

  const rows = tasks
    .map(
      (title) => `
      <tr>
        <td style="padding:5px 0; color:#1e293b; font-size:14px; text-align:right;">
          <span style="color:#22c55e; font-size:16px; margin-left:6px;">•</span>${title}
        </td>
      </tr>`,
    )
    .join('')

  return `
    <tr>
      <td style="padding-top:20px;">
        <p style="margin:0 0 8px; font-size:11px; font-weight:700; color:#94a3b8; text-transform:uppercase; letter-spacing:0.06em; text-align:right;">
          משימות ללא שעה
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse; border-top:1px solid #F1F5F9; padding-top:8px;">
          ${rows}
        </table>
      </td>
    </tr>`
}

function legend(): string {
  return `
    <table cellpadding="0" cellspacing="0" style="margin:12px auto 0;">
      <tr>
        ${Object.values(TYPE_META)
          .map(
            ({ bg, color, label }) => `
          <td style="padding:0 5px;">
            <span style="display:inline-block; background:${bg}; color:${color}; font-size:11px; font-weight:700; padding:3px 10px; border-radius:20px;">
              ${label}
            </span>
          </td>`,
          )
          .join('')}
      </tr>
    </table>`
}

export function buildDigestHtml({
  fullName,
  tomorrowLabel,
  timedItems,
  untimedTasks,
}: DigestPayload): string {
  const totalItems = timedItems.length + untimedTasks.length
  const greeting = totalItems > 0
    ? `מחר יש לך ${totalItems} פריטים — הנה הסיכום:`
    : 'מחר אין פריטים מתוכננים.'

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0; padding:0; background:#F8FAFC; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif; direction:rtl; text-align:right;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;" dir="rtl">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px; width:100%;" dir="rtl">

        <!-- HEADER -->
        <tr>
          <td align="center" style="background:linear-gradient(135deg,#3b82f6 0%,#2563eb 100%); border-radius:20px; padding:28px 28px 24px;">
            <p style="margin:0 0 12px; font-size:26px; line-height:1; text-align:center;">&#128197;</p>
            <h1 style="margin:0 0 4px; color:#fff; font-size:22px; font-weight:700; letter-spacing:-0.3px; text-align:center;">
              &#1500;&#1493;&#1494; &#1500;&#1502;&#1495;&#1512;
            </h1>
            <p style="margin:0; color:rgba(255,255,255,0.85); font-size:15px; font-weight:600; text-align:center;">
              ${tomorrowLabel}
            </p>
          </td>
        </tr>

        <tr><td style="height:8px;"></td></tr>

        <!-- MAIN CARD -->
        <tr>
          <td style="background:#fff; border-radius:20px; padding:24px 28px; box-shadow:0 1px 3px rgba(0,0,0,0.06),0 4px 16px rgba(0,0,0,0.04);">
            <table width="100%" cellpadding="0" cellspacing="0" dir="rtl">

              <!-- Greeting -->
              <tr>
                <td style="padding-bottom:20px; color:#475569; font-size:14px; line-height:1.7; text-align:right;">
                  &#1513;&#1500;&#1493;&#1501; ${fullName || ''} &#128075;<br/>${greeting}
                </td>
              </tr>

              <!-- Timeline -->
              <tr>
                <td>
                  <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;" dir="rtl">
                    ${timelineRows(timedItems)}
                  </table>
                </td>
              </tr>

              <!-- Untimed tasks -->
              ${untimedSection(untimedTasks)}

            </table>
          </td>
        </tr>

        <!-- LEGEND -->
        <tr>
          <td align="center">
            ${legend()}
          </td>
        </tr>

        <tr><td style="height:16px;"></td></tr>

        <!-- FOOTER -->
        <tr>
          <td align="center">
            <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
              <tr>
                <td style="width:20px; height:20px; background:linear-gradient(135deg,#3b82f6,#2563eb); border-radius:6px; text-align:center; vertical-align:middle;">
                  <span style="color:#fff; font-size:11px; font-weight:700; line-height:20px;">W</span>
                </td>
                <td style="padding-right:6px; font-size:12px; color:#94a3b8; vertical-align:middle;">
                  WeekFlow &middot; &#1497;&#1493;&#1502;&#1503; &#1513;&#1489;&#1493;&#1506;&#1497; &#1495;&#1499;&#1501;
                </td>
              </tr>
            </table>
            <p style="margin:6px 0 0; font-size:11px; color:#cbd5e1; text-align:center;">
              &#1500;&#1513;&#1497;&#1504;&#1493;&#1497; &#1492;&#1490;&#1491;&#1512;&#1493;&#1514; &#8212; &#1499;&#1504;&#1505; &#1500;&#1492;&#1490;&#1491;&#1512;&#1493;&#1514; &#1489;&#1488;&#1508;&#1500;&#1497;&#1511;&#1510;&#1497;&#1492;
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`
}
