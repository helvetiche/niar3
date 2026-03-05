declare module 'xlsx-calc' {
  import * as XLSX from 'xlsx';
  
  function XLSX_CALC(workbook: XLSX.WorkBook): void;
  
  export = XLSX_CALC;
}
