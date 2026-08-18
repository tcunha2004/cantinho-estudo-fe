import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiClient } from './api-client';

export interface SubjectOption {
  id: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class SubjectService {
  private readonly api = inject(ApiClient);

  /* Lista mestra de matérias — só o admin usa, pra editar as de um professor. */
  getAll(): Observable<SubjectOption[]> {
    return this.api.get<SubjectOption[]>('/subjects');
  }
}
