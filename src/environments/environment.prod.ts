/**
 * Produção. A API responde na mesma origem do app, atrás de `/api`: herda o
 * HTTPS do host (token não trafega em texto claro), não precisa de CORS e não
 * fixa domínio nenhum no bundle. Servir a API em outro domínio é trocar aqui.
 */
export const environment = {
  apiBaseUrl: '/api',
};
