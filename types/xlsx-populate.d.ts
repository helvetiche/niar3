declare module "xlsx-populate" {
  interface Workbook {
    sheet(nameOrIndex: string | number): Sheet;
    cloneSheet(from: Sheet, name: string, indexOrBeforeSheet?: number | string | Sheet): Sheet;
    outputAsync(mimeType?: string): Promise<Buffer | ArrayBuffer>;
    toFileAsync(path: string, options?: { password?: string }): Promise<void>;
  }

  interface Sheet {
    cell(ref: string): Cell;
    range(ref: string): Range;
    name(name?: string): string | Sheet;
  }

  interface Cell {
    value(val?: string | number): string | number | this;
    style(name: string, value: string): this;
  }

  interface Range {
    value(val?: unknown): unknown;
  }

  function fromFileAsync(
    path: string,
    options?: { password?: string },
  ): Promise<Workbook>;

  function fromDataAsync(data: Buffer | ArrayBuffer | Blob): Promise<Workbook>;

  function fromBlankAsync(): Promise<Workbook>;
}
