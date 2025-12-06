export interface MessageData {
  date: Date;
  count: number;
}

export interface DayData {
  date: Date;
  count: number;
  dateString: string;
}

function detectDateFormat(lines: string[], iphoneRegex: RegExp, androidRegex: RegExp): 'DD/MM/YY' | 'MM/DD/YY' {
  // Sample up to 1000 lines to detect the date format
  const sampleSize = Math.min(1000, lines.length);
  const dateStrings: string[] = [];

  for (let i = 0; i < sampleSize; i++) {
    const line = lines[i];
    let match = line.match(iphoneRegex);

    if (!match) {
      match = line.match(androidRegex);
    }

    if (match) {
      dateStrings.push(match[1]);
    }
  }

  if (dateStrings.length === 0) {
    console.log('No dates found in sample, defaulting to DD/MM/YY');
    return 'DD/MM/YY';
  }

  // Count evidence for each format
  let ddmmScore = 0;
  let mmddScore = 0;

  for (const dateStr of dateStrings) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const first = parseInt(parts[0]);
      const second = parseInt(parts[1]);

      // Strong evidence
      if (first > 12 && second <= 12) {
        // First > 12 means it must be DD/MM/YY
        ddmmScore += 10;
      } else if (second > 12 && first <= 12) {
        // Second > 12 means it must be MM/DD/YY
        mmddScore += 10;
      } else if (first <= 12 && second <= 12) {
        // Ambiguous - look for patterns
        // Days 13-31 are more common than months 13+
        // If we see first number frequently > 12 in other samples, it's likely DD/MM/YY
        if (first > second) {
          ddmmScore += 1; // Slight preference for DD/MM/YY
        } else if (second > first) {
          mmddScore += 1; // Slight preference for MM/DD/YY
        }
      }
    }
  }

  const format = ddmmScore >= mmddScore ? 'DD/MM/YY' : 'MM/DD/YY';
  console.log(`Date format detection: DD/MM/YY score=${ddmmScore}, MM/DD/YY score=${mmddScore}`);
  console.log(`Detected format: ${format}`);

  return format;
}

export function parseWhatsAppChat(content: string): Map<string, number> {
  console.log('Starting to parse WhatsApp chat...');
  console.log('Content length:', content.length, 'characters');

  const messageCountByDate = new Map<string, number>();

  // Two regex patterns for different WhatsApp export formats:
  // 1. iPhone format: [11/18/25, 8:17:23 PM] Name: Message
  const iphoneRegex = /\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM)?\]/i;

  // 2. Android format: 19/04/21, 1:22 pm - Name: Message
  const androidRegex = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),\s*\d{1,2}:\d{2}(?::\d{2})?\s*(?:am|pm)?\s*-/i;

  const lines = content.split('\n');
  console.log('Total lines:', lines.length);

  // Auto-detect date format
  const dateFormat = detectDateFormat(lines, iphoneRegex, androidRegex);
  const isDDMMYY = dateFormat === 'DD/MM/YY';

  // Sample first 5 lines to show format
  console.log('First 5 lines of the file:');
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    console.log(`Line ${i}:`, lines[i].substring(0, 100));
  }

  let matchCount = 0;
  let iphoneCount = 0;
  let androidCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Try iPhone format first
    let match = line.match(iphoneRegex);
    let dateStr: string | null = null;

    if (match) {
      dateStr = match[1];
      iphoneCount++;
    } else {
      // Try Android format
      match = line.match(androidRegex);
      if (match) {
        dateStr = match[1];
        androidCount++;
      }
    }

    if (dateStr) {
      matchCount++;

      // Parse the date based on detected format
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const first = parseInt(parts[0]);
        const second = parseInt(parts[1]);
        let year = parseInt(parts[2]);

        // Handle 2-digit year
        if (year < 100) {
          year += 2000;
        }

        // Parse according to detected format
        let date: Date;
        if (isDDMMYY) {
          // DD/MM/YY format
          date = new Date(year, second - 1, first);
        } else {
          // MM/DD/YY format
          date = new Date(year, first - 1, second);
        }

        if (!isNaN(date.getTime())) {
          const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD
          messageCountByDate.set(dateKey, (messageCountByDate.get(dateKey) || 0) + 1);
        }
      }
    }

    // Log progress every 5000 lines
    if (i > 0 && i % 5000 === 0) {
      console.log(`Progress: ${i}/${lines.length} lines processed (${Math.round(i / lines.length * 100)}%)`);
    }
  }

  console.log('Parsing complete!');
  console.log('Format detection - iPhone:', iphoneCount, 'Android:', androidCount);
  console.log('Total messages found:', matchCount);
  console.log('Unique dates:', messageCountByDate.size);
  console.log('Total messages counted:', Array.from(messageCountByDate.values()).reduce((a, b) => a + b, 0));

  return messageCountByDate;
}

export function generateHeatmapData(messagesByDate: Map<string, number>, year?: number): DayData[] {
  if (messagesByDate.size === 0) return [];

  // Get date range from messages
  const dates = Array.from(messagesByDate.keys()).map(d => new Date(d));
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));

  // If year is specified, use that year's range
  let startDate: Date;
  let endDate: Date;

  if (year) {
    startDate = new Date(year, 0, 1); // Jan 1 of selected year
    endDate = new Date(year, 11, 31); // Dec 31 of selected year
  } else {
    // Default: show last year of data
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    startDate = minDate < oneYearAgo ? oneYearAgo : minDate;
    endDate = new Date();
  }

  // Generate all dates in range
  const heatmapData: DayData[] = [];
  const currentDate = new Date(startDate);
  currentDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);

  while (currentDate <= endDate) {
    const dateKey = currentDate.toISOString().split('T')[0];
    const count = messagesByDate.get(dateKey) || 0;

    heatmapData.push({
      date: new Date(currentDate),
      count,
      dateString: dateKey
    });

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return heatmapData;
}

export function getAvailableYears(messagesByDate: Map<string, number>): number[] {
  if (messagesByDate.size === 0) return [];

  const dates = Array.from(messagesByDate.keys()).map(d => new Date(d));
  const years = new Set(dates.map(d => d.getFullYear()));

  return Array.from(years).sort((a, b) => b - a); // Descending order
}

export function getIntensityLevel(count: number, maxCount: number): number {
  if (count === 0) return 0;
  if (maxCount === 0) return 0;

  const percentage = (count / maxCount) * 100;

  if (percentage <= 20) return 1;
  if (percentage <= 40) return 2;
  if (percentage <= 60) return 3;
  if (percentage <= 80) return 4;
  return 5;
}
