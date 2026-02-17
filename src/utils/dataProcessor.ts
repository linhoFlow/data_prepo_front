import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export type DataRow = Record<string, unknown>;
export type DataColumn = {
    name: string;
    type: 'numeric' | 'categorical' | 'datetime' | 'boolean' | 'unknown';
    nullCount: number;
    nullPercentage: number;
    uniqueCount: number;
    sampleValues: unknown[];
};

export type DatasetInfo = {
    rows: number;
    columns: number;
    columnInfo: DataColumn[];
    data: DataRow[];
    headers: string[];
};

export type ColumnStats = {
    mean: number;
    median: number;
    mode: unknown;
    std: number;
    min: number;
    max: number;
    q1: number;
    q3: number;
    iqr: number;
    skewness: number;
    isNormal: boolean;
    isSymmetric: boolean;
};

// Parse file (CSV or Excel)
export function parseFile(file: File): Promise<DatasetInfo> {
    return new Promise((resolve, reject) => {
        const ext = file.name.split('.').pop()?.toLowerCase();
        if (ext === 'csv' || ext === 'tsv') {
            Papa.parse(file, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const data = results.data as DataRow[];
                    const headers = results.meta.fields || [];
                    resolve(buildDatasetInfo(data, headers));
                },
                error: (err) => reject(err),
            });
        } else if (ext === 'xlsx' || ext === 'xls') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const wb = XLSX.read(e.target?.result, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    const data = XLSX.utils.sheet_to_json<DataRow>(ws);
                    const headers = data.length > 0 ? Object.keys(data[0]) : [];
                    resolve(buildDatasetInfo(data, headers));
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        } else if (ext === 'json') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    let data = JSON.parse(content);
                    if (!Array.isArray(data)) {
                        // If it's a single object, wrap it
                        data = [data];
                    }
                    const headers = data.length > 0 ? Object.keys(data[0]) : [];
                    resolve(buildDatasetInfo(data, headers));
                } catch (err) {
                    reject(new Error('Erreur de format JSON: ' + (err as Error).message));
                }
            };
            reader.readAsText(file);
        } else if (ext === 'xml') {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(content, 'text/xml');
                    const root = xmlDoc.documentElement;
                    const rows = Array.from(root.children);

                    const data: DataRow[] = rows.map(row => {
                        const obj: DataRow = {};
                        Array.from(row.children).forEach(col => {
                            const val = col.textContent;
                            // Attempt to parse numbers
                            if (val && !isNaN(Number(val)) && val.trim() !== '') {
                                obj[col.tagName] = Number(val);
                            } else {
                                obj[col.tagName] = val;
                            }
                        });
                        return obj;
                    });

                    const headers = data.length > 0 ? Object.keys(data[0]) : [];
                    resolve(buildDatasetInfo(data, headers));
                } catch (err) {
                    reject(new Error('Erreur de format XML: ' + (err as Error).message));
                }
            };
            reader.readAsText(file);
        } else {
            reject(new Error('Format non supporté. Utilisez CSV, TSV, XLS, XLSX, JSON ou XML.'));
        }
    });
}

function buildDatasetInfo(data: DataRow[], headers: string[]): DatasetInfo {
    const columnInfo: DataColumn[] = headers.map((name) => {
        const values = data.map((row) => row[name]);
        const nonNull = values.filter((v) => v !== null && v !== undefined && v !== '');
        const type = detectColumnType(nonNull);
        const nullCount = values.length - nonNull.length;
        return {
            name,
            type,
            nullCount,
            nullPercentage: data.length > 0 ? (nullCount / data.length) * 100 : 0,
            uniqueCount: new Set(nonNull.map(String)).size,
            sampleValues: nonNull.slice(0, 5),
        };
    });

    return { rows: data.length, columns: headers.length, columnInfo, data, headers };
}

function detectColumnType(values: unknown[]): DataColumn['type'] {
    if (values.length === 0) return 'unknown';
    const sample = values.slice(0, 100);
    const numericCount = sample.filter((v) => typeof v === 'number' || (typeof v === 'string' && !isNaN(Number(v)) && v.trim() !== '')).length;
    if (numericCount / sample.length > 0.8) return 'numeric';
    const boolCount = sample.filter((v) => typeof v === 'boolean' || (typeof v === 'string' && ['true', 'false', '0', '1'].includes(v.toLowerCase()))).length;
    if (boolCount / sample.length > 0.8) return 'boolean';
    return 'categorical';
}

// Statistics
export function computeColumnStats(data: DataRow[], column: string): ColumnStats | null {
    const values = data
        .map((row) => {
            const v = row[column];
            return typeof v === 'number' ? v : parseFloat(String(v));
        })
        .filter((v) => !isNaN(v));

    if (values.length === 0) return null;
    values.sort((a, b) => a - b);

    const n = values.length;
    const mean = values.reduce((s, v) => s + v, 0) / n;
    const median = n % 2 === 0 ? (values[n / 2 - 1] + values[n / 2]) / 2 : values[Math.floor(n / 2)];
    const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
    const std = Math.sqrt(variance);
    const min = values[0];
    const max = values[n - 1];
    const q1 = values[Math.floor(n * 0.25)];
    const q3 = values[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    // Skewness (Fisher)
    const skewness = n > 2 ? (values.reduce((s, v) => s + ((v - mean) / std) ** 3, 0) * n) / ((n - 1) * (n - 2)) : 0;
    const isNormal = Math.abs(skewness) < 0.5;
    const isSymmetric = Math.abs(skewness) < 1;

    // Mode
    const freq: Record<string, number> = {};
    values.forEach((v) => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(freq));
    const modeVal = Object.entries(freq).find(([, f]) => f === maxFreq)?.[0];
    const mode = modeVal !== undefined ? parseFloat(modeVal) : mean;

    return { mean, median, mode, std, min, max, q1, q3, iqr, skewness, isNormal, isSymmetric };
}

// Remove duplicates
export function removeDuplicates(data: DataRow[]): { cleaned: DataRow[]; removed: number } {
    const seen = new Set<string>();
    const cleaned: DataRow[] = [];
    let removed = 0;
    for (const row of data) {
        const key = JSON.stringify(row);
        if (seen.has(key)) {
            removed++;
        } else {
            seen.add(key);
            cleaned.push(row);
        }
    }
    return { cleaned, removed };
}

// Missing value imputation
export function imputeByMean(data: DataRow[], column: string): DataRow[] {
    const stats = computeColumnStats(data, column);
    if (!stats) return data;
    return data.map((row) => {
        const v = row[column];
        if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) {
            return { ...row, [column]: Math.round(stats.mean * 100) / 100 };
        }
        return row;
    });
}

export function imputeByMedian(data: DataRow[], column: string): DataRow[] {
    const stats = computeColumnStats(data, column);
    if (!stats) return data;
    return data.map((row) => {
        const v = row[column];
        if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) {
            return { ...row, [column]: stats.median };
        }
        return row;
    });
}

export function imputeByMode(data: DataRow[], column: string): DataRow[] {
    const values = data.map((row) => row[column]).filter((v) => v !== null && v !== undefined && v !== '');
    const freq: Record<string, number> = {};
    values.forEach((v) => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
    const maxFreq = Math.max(...Object.values(freq));
    const mode = Object.entries(freq).find(([, f]) => f === maxFreq)?.[0] ?? '';
    return data.map((row) => {
        const v = row[column];
        if (v === null || v === undefined || v === '') return { ...row, [column]: mode };
        return row;
    });
}

export function imputeByConstant(data: DataRow[], column: string, constant: unknown): DataRow[] {
    return data.map((row) => {
        const v = row[column];
        if (v === null || v === undefined || v === '') return { ...row, [column]: constant };
        return row;
    });
}

export function imputeByFFill(data: DataRow[], column: string): DataRow[] {
    let lastValid: unknown = null;
    return data.map((row) => {
        const v = row[column];
        if (v !== null && v !== undefined && v !== '') { lastValid = v; return row; }
        return { ...row, [column]: lastValid };
    });
}

export function imputeBFill(data: DataRow[], column: string): DataRow[] {
    const result = [...data.map((r) => ({ ...r }))];
    let lastValid: unknown = null;
    for (let i = result.length - 1; i >= 0; i--) {
        const v = result[i][column];
        if (v !== null && v !== undefined && v !== '') { lastValid = v; }
        else { result[i][column] = lastValid; }
    }
    return result;
}

export function imputeByInterpolation(data: DataRow[], column: string): DataRow[] {
    const result = [...data.map((r) => ({ ...r }))];
    for (let i = 0; i < result.length; i++) {
        const v = result[i][column];
        if (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) {
            let prevIdx = -1, nextIdx = -1;
            for (let j = i - 1; j >= 0; j--) {
                const pv = result[j][column];
                if (pv !== null && pv !== undefined && pv !== '') { prevIdx = j; break; }
            }
            for (let j = i + 1; j < result.length; j++) {
                const nv = result[j][column];
                if (nv !== null && nv !== undefined && nv !== '') { nextIdx = j; break; }
            }
            if (prevIdx >= 0 && nextIdx >= 0) {
                const prevVal = Number(result[prevIdx][column]);
                const nextVal = Number(result[nextIdx][column]);
                const ratio = (i - prevIdx) / (nextIdx - prevIdx);
                result[i][column] = Math.round((prevVal + ratio * (nextVal - prevVal)) * 100) / 100;
            } else if (prevIdx >= 0) {
                result[i][column] = result[prevIdx][column];
            } else if (nextIdx >= 0) {
                result[i][column] = result[nextIdx][column];
            }
        }
    }
    return result;
}

// KNN Imputer (simplified euclidean distance)
export function imputeKNN(data: DataRow[], column: string, numericCols: string[], k = 5): DataRow[] {
    const result = [...data.map((r) => ({ ...r }))];
    const missingIdxs = result.map((r, i) => {
        const v = r[column];
        return (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) ? i : -1;
    }).filter((i) => i >= 0);

    const completeCols = numericCols.filter((c) => c !== column);

    for (const idx of missingIdxs) {
        const distances: { i: number; d: number; val: number }[] = [];
        for (let j = 0; j < result.length; j++) {
            if (j === idx) continue;
            const targetVal = result[j][column];
            if (targetVal === null || targetVal === undefined || targetVal === '') continue;
            let dist = 0;
            let validDims = 0;
            for (const c of completeCols) {
                const a = Number(result[idx][c]);
                const b = Number(result[j][c]);
                if (!isNaN(a) && !isNaN(b)) { dist += (a - b) ** 2; validDims++; }
            }
            if (validDims > 0) {
                distances.push({ i: j, d: Math.sqrt(dist / validDims), val: Number(targetVal) });
            }
        }
        distances.sort((a, b) => a.d - b.d);
        const neighbors = distances.slice(0, k);
        if (neighbors.length > 0) {
            result[idx][column] = Math.round((neighbors.reduce((s, n) => s + n.val, 0) / neighbors.length) * 100) / 100;
        }
    }
    return result;
}

// Outlier detection & treatment
export function detectOutliersIQR(data: DataRow[], column: string): { outlierIndices: number[]; lowerBound: number; upperBound: number } {
    const stats = computeColumnStats(data, column);
    if (!stats) return { outlierIndices: [], lowerBound: 0, upperBound: 0 };
    const lowerBound = stats.q1 - 1.5 * stats.iqr;
    const upperBound = stats.q3 + 1.5 * stats.iqr;
    const outlierIndices = data.map((row, i) => {
        const v = Number(row[column]);
        return (!isNaN(v) && (v < lowerBound || v > upperBound)) ? i : -1;
    }).filter((i) => i >= 0);
    return { outlierIndices, lowerBound, upperBound };
}

export function treatOutliersIQR(data: DataRow[], column: string): DataRow[] {
    const { lowerBound, upperBound } = detectOutliersIQR(data, column);
    return data.map((row) => {
        const v = Number(row[column]);
        if (isNaN(v)) return row;
        if (v < lowerBound) return { ...row, [column]: lowerBound };
        if (v > upperBound) return { ...row, [column]: upperBound };
        return row;
    });
}

export function treatOutliersWinsor(data: DataRow[], column: string, lowerPerc = 5, upperPerc = 95): DataRow[] {
    const values = data.map((row) => Number(row[column])).filter((v) => !isNaN(v));
    if (values.length === 0) return data;
    values.sort((a, b) => a - b);
    const lowerVal = values[Math.floor(values.length * lowerPerc / 100)] ?? values[0];
    const upperVal = values[Math.floor(values.length * upperPerc / 100)] ?? values[values.length - 1];
    return data.map((row) => {
        const v = Number(row[column]);
        if (isNaN(v)) return row;
        if (v < lowerVal) return { ...row, [column]: lowerVal };
        if (v > upperVal) return { ...row, [column]: upperVal };
        return row;
    });
}

export function treatOutliersZScore(data: DataRow[], column: string, threshold = 3): DataRow[] {
    const stats = computeColumnStats(data, column);
    if (!stats || stats.std === 0) return data;
    // User Rules: Replace by Mean if Normal, by Median if quasi-normal
    const replacement = stats.isNormal ? stats.mean : stats.median;
    return data.map((row) => {
        const v = Number(row[column]);
        if (isNaN(v)) return row;
        const z = Math.abs((v - stats.mean) / stats.std);
        if (z > threshold) return { ...row, [column]: Math.round(replacement * 100) / 100 };
        return row;
    });
}

// Encoding
export function oneHotEncode(data: DataRow[], columns: string[]): { data: DataRow[]; newColumns: string[] } {
    const newColumns: string[] = [];
    let result = [...data.map((r) => ({ ...r }))];
    for (const col of columns) {
        const uniqueVals = [...new Set(data.map((r) => String(r[col] ?? '')))];
        for (const val of uniqueVals) {
            const newCol = `${col}_${val}`;
            newColumns.push(newCol);
            result = result.map((row) => ({ ...row, [newCol]: String(row[col] ?? '') === val ? 1 : 0 }));
        }
        result = result.map((row) => { const { [col]: _, ...rest } = row; return rest; });
    }
    return { data: result, newColumns };
}

export function ordinalEncode(data: DataRow[], column: string, order: string[]): DataRow[] {
    const mapping: Record<string, number> = {};
    order.forEach((val, i) => { mapping[val] = i; });
    return data.map((row) => ({ ...row, [column]: mapping[String(row[column])] ?? -1 }));
}

export function labelEncode(data: DataRow[], column: string): { data: DataRow[]; mapping: Record<string, number> } {
    const uniqueVals = [...new Set(data.map((r) => String(r[column] ?? '')))];
    const mapping: Record<string, number> = {};
    uniqueVals.forEach((v, i) => { mapping[v] = i; });
    const encoded = data.map((row) => ({ ...row, [column]: mapping[String(row[column])] ?? -1 }));
    return { data: encoded, mapping };
}

// Scaling
export function minMaxScale(data: DataRow[], columns: string[]): DataRow[] {
    const result = [...data.map((r) => ({ ...r }))];
    for (const col of columns) {
        const values = result.map((r) => Number(r[col])).filter((v) => !isNaN(v));
        const min = Math.min(...values);
        const max = Math.max(...values);
        const range = max - min;
        if (range === 0) continue;
        for (const row of result) {
            const v = Number(row[col]);
            if (!isNaN(v)) row[col] = Math.round(((v - min) / range) * 10000) / 10000;
        }
    }
    return result;
}

export function standardScale(data: DataRow[], columns: string[]): DataRow[] {
    const result = [...data.map((r) => ({ ...r }))];
    for (const col of columns) {
        const stats = computeColumnStats(result, col);
        if (!stats || stats.std === 0) continue;
        for (const row of result) {
            const v = Number(row[col]);
            if (!isNaN(v)) row[col] = Math.round(((v - stats.mean) / stats.std) * 10000) / 10000;
        }
    }
    return result;
}

export function robustScale(data: DataRow[], columns: string[]): DataRow[] {
    const result = [...data.map((r) => ({ ...r }))];
    for (const col of columns) {
        const stats = computeColumnStats(result, col);
        if (!stats || stats.iqr === 0) continue;
        for (const row of result) {
            const v = Number(row[col]);
            if (!isNaN(v)) row[col] = Math.round(((v - stats.median) / stats.iqr) * 10000) / 10000;
        }
    }
    return result;
}

// Correlation matrix
export function correlationMatrix(data: DataRow[], columns: string[]): { matrix: number[][]; columns: string[] } {
    const n = data.length;
    const matrix: number[][] = [];
    for (let i = 0; i < columns.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < columns.length; j++) {
            if (i === j) { matrix[i][j] = 1; continue; }
            const xVals = data.map((r) => Number(r[columns[i]]));
            const yVals = data.map((r) => Number(r[columns[j]]));
            const xMean = xVals.reduce((s, v) => s + v, 0) / n;
            const yMean = yVals.reduce((s, v) => s + v, 0) / n;
            let num = 0, denX = 0, denY = 0;
            for (let k = 0; k < n; k++) {
                const dx = xVals[k] - xMean;
                const dy = yVals[k] - yMean;
                num += dx * dy;
                denX += dx * dx;
                denY += dy * dy;
            }
            const den = Math.sqrt(denX * denY);
            matrix[i][j] = den === 0 ? 0 : Math.round((num / den) * 1000) / 1000;
        }
    }
    return { matrix, columns };
}

// Export to CSV
export function exportToCSV(data: DataRow[], filename = 'preprocessed_data.csv'): void {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// Export to Excel
export function exportToExcel(data: DataRow[], filename = 'preprocessed_data.xlsx'): void {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`);
}

// Export to JSON
export function exportToJSON(data: DataRow[], filename = 'preprocessed_data.json'): void {
    const json = JSON.stringify(data, null, 4);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename.endsWith('.json') ? filename : `${filename}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
}

// Export to XML
export function exportToXML(data: DataRow[], filename = 'preprocessed_data.xml'): void {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<root>\n';
    data.forEach((row) => {
        xml += '  <row>\n';
        Object.entries(row).forEach(([key, val]) => {
            // Basic cleansing of keys for XML tags (spaces to underscores, etc)
            const tag = key.replace(/[^a-zA-Z0-9]/g, '_');
            xml += `    <${tag}>${val !== null && val !== undefined ? String(val).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</${tag}>\n`;
        });
        xml += '  </row>\n';
    });
    xml += '</root>';

    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename.endsWith('.xml') ? filename : `${filename}.xml`;
    link.click();
    URL.revokeObjectURL(link.href);
}
