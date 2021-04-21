export {};

declare global {
  interface JQuery {
    isOnScreen(x?: any, y?: any): boolean;

    table2CSV(inputOptions: {
      delivery: string,
      separator?: string,
      header?: any[],
    }): string | boolean;
  }
}