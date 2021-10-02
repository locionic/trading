import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { OcrModel } from '../model/ocr-model';
import { Router } from '@angular/router';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class OcrMainService {
  private lstOcrModel: OcrModel[] = [];
  private ocrModelUpdated = new Subject<OcrModel[]>();
  constructor(private http: HttpClient, private router: Router) {}

  getLstOcrModel() {
    this.http
      .get<{ message: string; data: any }>('http://localhost:3001/api/ocrmodels')
      .pipe(
        map((res) => {
          return res.data.map((model: OcrModel) => {
            return {
              id: model.id,
              loaivanban: model.loaivanban,
              coquanbanhanh: model.coquanbanhanh,
              sovanban: model.sovanban,
              nguoiky: model.nguoiky,
              name: model.name,
              state: model.state,
              createdBy: model.createdBy,
              createdDate: model.createdDate,
              files: model.files,
              isOcr: model.isOcr,
              isExtract: model.isExtract,
            };
          });
        })
      )
      .subscribe((transformedPosts) => {
        this.lstOcrModel = transformedPosts;
        this.ocrModelUpdated.next([...this.lstOcrModel]);
      });
  }

  getLstOcrModelUpdateListener() {
    return this.ocrModelUpdated.asObservable();
  }

  public extractMetadata(data: string): Observable<any> {
    const url = `http://103.124.95.102:9006/vanban/extract_vanban`;
    let httpHeaders = new HttpHeaders({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    });
    return this.http.post(
      url,
      { content: data },
      {
        headers: httpHeaders,
      }
    );
  }

  public transformer(file: File): Observable<any> {
    let body = new FormData();
    body.append('file', file);
    const url = ` http://103.170.122.74:8000/api/ocr/transformer/`;
    let httpHeaders = new HttpHeaders({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    });
    return this.http.post<any>(url, body, {
      headers: httpHeaders,
    });
  }

  public getTaskOCR(task: string): Observable<any> {
    const url = `http://103.170.122.74:8000/api/task/${task}`;
    let httpHeaders = new HttpHeaders({
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Credentials': 'true',
    });
    return this.http.get(url, {
      headers: httpHeaders,
    });
  }
}
