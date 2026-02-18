
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
    id?: string;
    transformations?: string[];
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
