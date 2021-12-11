import { DatePipe } from '@angular/common';
import { Component, Inject, OnInit, ViewChild } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { DocformComponent } from 'src/app/component/docform/docform.component';
import { TableAlignment, TableColumn } from 'src/app/module/common/model/TableColumn';
import { DocumentMetadata } from 'src/app/module/document/model/document.metadata';
import { DocumentProcessService } from 'src/app/module/document/service/document.process.service';
import { DocumentSearchService } from 'src/app/module/document/service/document.search.service';
import Swal from "sweetalert2";

@Component({
  selector: 'app-approve.modal',
  templateUrl: './approve.modal.component.html',
  styleUrls: ['./approve.modal.component.scss']
})
export class ApproveModalComponent implements OnInit {

  @ViewChild("docForm") docForm: DocformComponent | undefined;

  doc: any = {};
  meta: DocumentMetadata[] = [];
  metaChunks: DocumentMetadata[][] = [];
  ignoreFields: string[] = [
    "content",
    "companyId",
    "",
    "receivers",
    "tags",
    "attachments",
    "promulgationDateStr"
  ];
  tableColumns: TableColumn[] = [];
  tableData: any[] = [];
  validation: string[] = [];

  constructor(
    @Inject(MAT_DIALOG_DATA) private data: any,
    private documentService: DocumentSearchService,
    private datePipe: DatePipe,
    private documentProcessService: DocumentProcessService,
    private dialogService: MatDialog,
    private dialogRef: MatDialogRef<ApproveModalComponent>,
  ) { 
    
  }

  private prepareMetaData(): void {
    this.documentService.getDocProps()
      .subscribe(res => {
        if (res.isvalid) {
          this.meta = res.props.filter(prop => {
            if (this.doc[prop.name] && !this.ignoreFields.includes(prop.name) && prop.note && prop.name !== "content") { 
              if (prop.note) {
                prop.note = prop.note.replace(/\(.+\)/gi, "").trim();
              }
              return true;
            }

            return false;
          });

          this.doc = this.processMetaResponse(this.doc);
        }
      })
  }

  private prepareRelatedDocuments(): void {
    this.documentService.searchDocument(false, "", 1, 10, undefined, undefined, {
      signNumber: this.doc.signNumber
    }).subscribe(res => {
      this.tableData = res.hits.map(x => x._source);
    });
  }

  private prepareTableColumns(): void {
    this.documentService.getDocProps()
      .subscribe(res => {
        this.tableColumns = res.props.filter(x => x.name === "signNumber" || x.name === "subject")
          .map(x => {
            const column: TableColumn = {
              id: x.name,
              text: x.note ? x.note?.replace(/\(.+\)/gi, "").trim() : "",
              headerAlign: TableAlignment.LEFT,
              cellAlign: TableAlignment.LEFT,
              active: true
            };

            return column;
          });
      });
  }

  private processMetaResponse(data: any): any {
    this.meta.forEach(prop => {
      if (!data[prop.name]) {
        data[prop.name] = "";
      } else if (prop.type === "date") {
        data[prop.name] = this.datePipe.transform(new Date(+data[prop.name]), "yyyy-MM-ddThh:mm");
      }
    })
    return data;
  }

  ngOnInit(): void {
    this.doc = this.data.doc;

    this.prepareMetaData();
    this.prepareTableColumns();
    this.prepareRelatedDocuments();
  }

  private validateDocumentMeta(doc: any): boolean {
    this.validation = [];
    this.meta.forEach(prop => {
      if (!doc[prop.name]) {
        this.validation.push(`${prop.note} là thông tin bắt buộc`);
      }
    });

    return this.validation.length === 0;
  }

  processUploadMeta(obj: any): void {
    this.meta.forEach(prop => {
      if (obj[prop.name]) {
        switch (prop.type) {
          case "date":
            obj[prop.name] = this.datePipe.transform(new Date(obj[prop.name]), "dd/MM/yyyy");
            break;
          default:
            break;
        }
      }
    });
  }

  approve(): void {
    if (this.docForm) {
      if (this.validateDocumentMeta(this.docForm.getFormData())) {
        Swal.fire({
          title: "Xác nhận duyệt tài liệu?",
          showCancelButton: true
        }).then(res => {
          if (res.isConfirmed) {
            const document = this.docForm?.getFormData();
            this.processUploadMeta(document);
            this.documentProcessService.updateDocument(document)
              .subscribe(res => {
                if (res.isvalid) {
                  this.documentService.approveDocument(document.docidx)
                  .subscribe(res => {
                    this.dialogRef.close({refresh: true});
                  });
                }
              })
          }
        })
      }
    }
  }

  reject(): void {
    if (this.docForm) {
      Swal.fire({
        title: "Xác nhận huỷ tài liệu?",
        showCancelButton: true
      }).then(res => {
        if (res.isConfirmed) {
          const document = this.docForm?.getFormData();
          
          this.documentProcessService.deleteDocument(document.docidx)
            .subscribe(res => {
              if (res.isvalid) {
                this.dialogRef.close({refresh: true});
              }
            })
        }
      })
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  downloadAttachment(docId: number, file: any): void {
    const url = this.documentProcessService.fetchDownloadLink(docId, file);
    window.open(url, "_blank");
  }
}