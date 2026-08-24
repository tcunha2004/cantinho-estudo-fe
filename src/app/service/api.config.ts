import { environment } from '../../environments/environment';

/**
 * Base URL da API. Ponto único de configuração usado por todos os
 * serviços de acesso a dados (HTTP) da pasta `service`. O valor vem do
 * ambiente — ver `src/environments/`.
 */
export const API_BASE_URL = environment.apiBaseUrl;
