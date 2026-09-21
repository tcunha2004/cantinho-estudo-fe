import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { UserSummaryDto } from '../model/dto/user-summary.dto';
import { ApiClient } from './api-client';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly api = inject(ApiClient);

  getAll(): Observable<UserSummaryDto[]> {
    return this.api.get<UserSummaryDto[]>('/users');
  }

  /* Define a senha de um usuário que perdeu a sua. A senha guardada é hash
   * bcrypt e não pode ser lida de volta — recuperar acesso é redefinir. */
  setPassword(id: string, newPassword: string): Observable<{ id: string }> {
    return this.api.patch<{ id: string }>(`/users/${id}/password`, { newPassword });
  }
}
