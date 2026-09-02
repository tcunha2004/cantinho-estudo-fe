/**
 * Gera PDF pela impressão do navegador ("Salvar como PDF"), preservando o
 * layout da tela. `title` vira o nome do arquivo sugerido durante a
 * impressão — o `document.title` original é restaurado depois.
 */
export function downloadPdf(document: Document, title: string): void {
  const win = document.defaultView;
  const previousTitle = document.title;

  document.title = title;

  const restoreTitle = () => {
    document.title = previousTitle;
    win?.removeEventListener('afterprint', restoreTitle);
  };

  win?.addEventListener('afterprint', restoreTitle);
  win?.print();
}
