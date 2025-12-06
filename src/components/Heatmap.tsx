import { DayData, getIntensityLevel } from '../utils/parser';

interface HeatmapProps {
  data: DayData[];
  colorScheme: ColorScheme;
}

export interface ColorScheme {
  name: string;
  colors: string[];
}

function getDaySuffix(day: number): string {
  if (day >= 11 && day <= 13) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

export const colorSchemes: ColorScheme[] = [
  {
    name: 'GitHub Green',
    colors: ['#ebedf0', '#9be9a8', '#40c463', '#30a14e', '#216e39', '#0d4429']
  },
  {
    name: 'Blue',
    colors: ['#ebedf0', '#9ecbff', '#5e9cd3', '#3182ce', '#2c5282', '#1a365d']
  },
  {
    name: 'Purple',
    colors: ['#ebedf0', '#d4bbff', '#9f7aea', '#805ad5', '#6b46c1', '#553c9a']
  },
  {
    name: 'Orange',
    colors: ['#ebedf0', '#fed7aa', '#f6ad55', '#ed8936', '#dd6b20', '#c05621']
  },
  {
    name: 'Pink',
    colors: ['#ebedf0', '#fbb6ce', '#f687b3', '#ed64a6', '#d53f8c', '#b83280']
  },
  {
    name: 'Teal',
    colors: ['#ebedf0', '#81e6d9', '#4fd1c5', '#38b2ac', '#319795', '#2c7a7b']
  }
];

export default function Heatmap({ data, colorScheme }: HeatmapProps) {
  if (data.length === 0) return null;

  const maxCount = Math.max(...data.map(d => d.count));

  // Group data by weeks
  const weeks: DayData[][] = [];
  let currentWeek: DayData[] = [];

  // Fill in empty days at the start to align with Sunday
  const firstDay = data[0].date.getDay();
  for (let i = 0; i < firstDay; i++) {
    currentWeek.push({
      date: new Date(0),
      count: -1, // -1 indicates placeholder
      dateString: ''
    });
  }

  for (const day of data) {
    currentWeek.push(day);
    if (day.date.getDay() === 6) { // Saturday
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    // Fill remaining days
    while (currentWeek.length < 7) {
      currentWeek.push({
        date: new Date(0),
        count: -1,
        dateString: ''
      });
    }
    weeks.push(currentWeek);
  }

  const months: { name: string; startWeek: number }[] = [];
  let lastMonth = -1;

  weeks.forEach((week, weekIndex) => {
    const firstRealDay = week.find(d => d.count !== -1);
    if (firstRealDay) {
      const month = firstRealDay.date.getMonth();
      if (month !== lastMonth) {
        months.push({
          name: firstRealDay.date.toLocaleDateString('en-US', { month: 'short' }),
          startWeek: weekIndex
        });
        lastMonth = month;
      }
    }
  });

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="heatmap-container">
      <div className="heatmap-header">
        {months.map((month, idx) => (
          <div
            key={idx}
            className="month-label"
            style={{ gridColumn: `${month.startWeek + 2} / span 1` }}
          >
            {month.name}
          </div>
        ))}
      </div>
      <div className="heatmap-grid">
        <div className="day-labels">
          {dayLabels.map((label, idx) => (
            <div key={idx} className="day-label">
              {idx % 2 === 1 ? label : ''}
            </div>
          ))}
        </div>
        <div className="weeks">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="week">
              {week.map((day, dayIndex) => {
                if (day.count === -1) {
                  return <div key={dayIndex} className="day empty" />;
                }

                const intensity = getIntensityLevel(day.count, maxCount);
                const color = colorScheme.colors[intensity];

                // Format date like "14 messages on December 4th"
                const date = day.date;
                const dayOfMonth = date.getDate();
                const monthName = date.toLocaleDateString('en-US', { month: 'long' });
                const dayWithSuffix = dayOfMonth + getDaySuffix(dayOfMonth);
                const messageText = day.count === 1 ? 'message' : 'messages';
                const tooltipText = day.count === 0
                  ? `No messages on ${monthName} ${dayWithSuffix}`
                  : `${day.count} ${messageText} on ${monthName} ${dayWithSuffix}`;

                return (
                  <div
                    key={dayIndex}
                    className="day"
                    style={{ backgroundColor: color }}
                    data-tooltip={tooltipText}
                    data-count={day.count}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="heatmap-legend">
        <span className="legend-label">Less</span>
        {colorScheme.colors.map((color, idx) => (
          <div
            key={idx}
            className="legend-box"
            style={{ backgroundColor: color }}
          />
        ))}
        <span className="legend-label">More</span>
      </div>
    </div>
  );
}
