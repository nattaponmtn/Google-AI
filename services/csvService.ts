

export interface CSVRow {
  [key: string]: string | number;
}

/**
 * Parses a CSV string into a 2D array of strings.
 * Uses a state machine to correctly handle quoted fields containing delimiters or newlines.
 */
const parseCSVRaw = (text: string): string[][] => {
  const arr: string[][] = [];
  let quote = false;  // 'true' means we're inside a quoted field
  let row: string[] = [];
  let col = '';
  
  for (let c = 0; c < text.length; c++) {
    const cc = text[c];
    const nc = text[c+1]; // Next char

    // Quote handling
    if (cc === '"') {
        if (quote && nc === '"') {
            // Escaped quote inside quoted field ("") -> becomes single quote
            col += '"'; 
            c++; 
        } else {
            // Toggle quote state
            quote = !quote; 
        }
    } 
    // Comma handling
    else if (cc === ',' && !quote) { 
        row.push(col);
        col = ''; 
    } 
    // Newline handling
    else if ((cc === '\r' || cc === '\n') && !quote) {
        // If it's \r\n, skip the next \n
        if (cc === '\r' && nc === '\n') c++;
        
        row.push(col);
        arr.push(row);
        row = [];
        col = '';
    } 
    // Normal character
    else {
        col += cc;
    }
  }
  
  // Flush last column/row
  if (col.length > 0 || row.length > 0) {
      row.push(col);
      arr.push(row);
  }

  return arr;
};

export const fetchCSVData = async (url: string): Promise<CSVRow[]> => {
  try {
    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'Accept': 'text/csv'
        },
        cache: 'no-cache'
    });
    
    if (!response.ok) throw new Error(`Failed to fetch CSV: ${response.statusText}`);
    const text = await response.text();
    
    const rawRows = parseCSVRaw(text);
    if (rawRows.length === 0) return [];

    // First row is header
    const headers = rawRows[0].map(h => h.trim());
    const dataRows = rawRows.slice(1);

    return dataRows.map(row => {
        const obj: CSVRow = {};
        headers.forEach((h, i) => {
            if (h) {
                // Ensure we don't access out of bounds if row is shorter than header
                let val: string | number = (i < row.length) ? row[i].trim() : '';
                
                // Try convert to number if possible, excluding specific columns
                const lowerH = h.toLowerCase();
                const isMetaCol = lowerH.includes('time') || lowerH.includes('date') || lowerH.includes('id') || lowerH.includes('phone');
                
                if (val !== '' && !isNaN(Number(val)) && !isMetaCol) {
                     val = Number(val);
                }
                obj[h] = val;
            }
        });
        return obj;
    }).filter(row => Object.keys(row).length > 0); // Filter out empty rows

  } catch (error: any) {
    console.error("CSV Fetch Error:", error);
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
        throw new Error("CORS Error: Unable to fetch data. Ensure the Google Sheet is 'Published to the web' (File > Share > Publish to web) and use the generated CSV link.");
    }
    throw error;
  }
};
