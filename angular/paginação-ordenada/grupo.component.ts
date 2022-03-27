/* eslint-disable @typescript-eslint/no-shadow */
/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable eqeqeq */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/member-ordering */
import {
    AfterViewInit,
    ChangeDetectionStrategy,
    ChangeDetectorRef,
    Component,
    OnInit,
    ViewChild,
    ViewEncapsulation,
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup } from '@angular/forms';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { map, merge, Observable, Subject, switchMap, takeUntil } from 'rxjs';
import { fuseAnimations } from '@fuse/animations';
import { FuseConfirmationService } from '@fuse/services/confirmation';
import { InventoryPagination, Grupo } from '../grupo.types';
import {
    PaginationEnum,
    SortEnum,
} from 'app/modules/admin/grupos/grupo/grupo.enum';
import { MatDialog } from '@angular/material/dialog';
import { FormDialogComponent } from '../form-dialog/form-dialog.component';
import { FuseAlertService, FuseAlertType } from '@fuse/components/alert';
import { HttpParams } from '@angular/common/http';
import { TranslocoService } from '@ngneat/transloco';
import { GrupoService } from '../grupo.service';
import { HeaderBaseComponent } from '@kaila/header/header.component';

@Component({
    selector: 'grupo-list',
    templateUrl: './grupo.component.html',
    styleUrls: ['./grupo.component.scss'],
    encapsulation: ViewEncapsulation.None,
    changeDetection: ChangeDetectionStrategy.OnPush,
    animations: fuseAnimations,
})
export class GrupoListComponent implements OnInit, AfterViewInit {
    @ViewChild(HeaderBaseComponent) private _headerBase: HeaderBaseComponent;
    @ViewChild(MatPaginator) private _paginator: MatPaginator;
    @ViewChild(MatSort) private _sort: MatSort;

    grupos$: Observable<Grupo[]>;

    flashMessage: 'success' | 'error' | null = null;
    isLoading: boolean = false;
    pagination: InventoryPagination;
    //searchInputControl: FormControl = new FormControl();
    private _unsubscribeAll: Subject<any> = new Subject<any>();

    alert: { type: FuseAlertType; message: string } = {
        type: 'success',
        message: '',
    };
    showAlert: boolean = false;

    isShown: boolean = false; // hidden by default
    textTipoPesquisa: string = 'Pesquisa Avançada';
    iconTipoPesquisa: string = 'heroicons_outline:chevron-down';

    simplesSearchForm: FormGroup;
    advancedSearchForm: FormGroup;

    /**
     * Constructor
     */
    constructor(
        private _changeDetectorRef: ChangeDetectorRef,
        private _fuseConfirmationService: FuseConfirmationService,
        private _grupoService: GrupoService,
        public dialog: MatDialog,
        private _fuseAlertService: FuseAlertService,
        private fb: FormBuilder,
        private translocoService: TranslocoService
    ) {}

    toggleShow() {
        this.isShown = !this.isShown;
        if (this.isShown == true) {
            this.textTipoPesquisa = 'Pesquisa Simples';
            this.iconTipoPesquisa = 'heroicons_outline:chevron-up';

            this.simplesSearchForm.controls['valueSearchControl'].disable();
            this.simplesSearchForm.controls['columnSearchControl'].disable();
        } else {
            this.textTipoPesquisa = 'Pesquisa Avançada';
            this.iconTipoPesquisa = 'heroicons_outline:chevron-down';

            this.simplesSearchForm.controls['valueSearchControl'].enable();
            this.simplesSearchForm.controls['columnSearchControl'].enable();
        }
    }

    openAddGrupoDialog(): void {
        const dialogRef = this.dialog.open(FormDialogComponent, {
            width: '580px',
            height: '295px',
            data: {
                nome: ''
            },
            panelClass: 'fuse-confirmation-dialog-panel',
        });

        // save grupo
        dialogRef.afterClosed().subscribe((result) => {
            if (result && result != 'cancelled') {
                this.createGrupo(result);
            }
        });
    }

    openUpdateGrupoDialog(id: Number): void {
        let grupo: Grupo;

        this.grupos$.subscribe((grupos) => {
            grupo = grupos.find(grupo => grupo.id == id);
        });

        const dialogRef = this.dialog.open(FormDialogComponent, {
            width: '580px',
            height: '295px',
            data: grupo,
            panelClass: 'fuse-confirmation-dialog-panel',
        });

        // Create the form
        dialogRef.afterClosed().subscribe((result) => {
            if (result && result != 'cancelled') {
                this.updateGrupo(result);
            }
        });
    }

    /**
     * On init
     */
    ngOnInit(): void {
        this.formsBuilder();

        // Get the pagination
        this._grupoService.pagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination: InventoryPagination) => {
                // Update the pagination
                this.pagination = pagination;

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });

        // Get the grupo
        this.grupos$ = this._grupoService.grupos$;
    }

    formsBuilder() {
        this.simpleSearchFormBuilder();
        this.advancedSearchFormBuilder();
    }

    simpleSearchFormBuilder() {
        this.simplesSearchForm = this.fb.group({
            valueSearchControl: new FormControl(''),
            columnSearchControl: new FormControl('nome'),
        });
    }

    advancedSearchFormBuilder() {
        this.advancedSearchForm = this.fb.group({
            nome: new FormControl('')
        });
    }

    /**
     * After view init
     */
    ngAfterViewInit(): void {
        this._headerBase.formDialogRef = [
            FormDialogComponent,
            {
                width: '580px',
                height: '295px',
                data: {
                    nome: ''
                },
                panelClass: 'fuse-confirmation-dialog-panel',
            },
        ];
        this._headerBase.title = 'Grupos';
        this._headerBase.advancedSearchFormFG.addControl(
            'nome',
            new FormControl('')
        );
        this._headerBase.displayFields = [
            {
                value: 'nome',
                description: 'Nome',
                type: 'text',
            },
        ];
        this._headerBase.fieldsDataOptions = [
            {
                value: 'nome',
                description: 'Nome',
                type: 'text',
            },
        ];

        if (this._sort && this._paginator) {
            // Set the initial sort
            this._sort.sort({
                id: 'nome',
                start: 'asc',
                disableClear: true,
            });

            // Mark for check
            this._changeDetectorRef.markForCheck();

            // If the grupo changes the sort order...
            this._sort.sortChange
                .pipe(takeUntil(this._unsubscribeAll))
                .subscribe(() => {
                    // Reset back to the first page
                    this._paginator.pageIndex = 1;
                });

            // Get grupos if sort or page changes
            merge(this._sort.sortChange, this._paginator.page)
                .pipe(
                    switchMap(() => {
                        this.isLoading = true;

                        let params = new HttpParams();
                        params = params.append(
                            'page',
                            this._paginator.pageIndex
                        );
                        params = params.append(
                            'size',
                            this._paginator.pageSize
                        );
                        params = params.append('sort', this._sort.active);
                        params = params.append('order', this._sort.direction);

                        return this._grupoService.getGrupos(params);
                    }),
                    map(() => {
                        this.isLoading = false;
                    })
                )
                .subscribe();
        }
    }

    formFilter(params: HttpParams = new HttpParams()): void {
        // let params = new HttpParams();

        if (!this.isShown) {
            params = params.append(
                'value',
                this._headerBase.simplesSearchForm.controls[
                    'valueSearchControl'
                ].value
            );
            params = params.append(
                'column',
                this._headerBase.simplesSearchForm.controls[
                    'columnSearchControl'
                ].value
            );
        } else {
            params = params.append(
                'nome',
                this._headerBase.advancedSearchForm.controls['nome'].value
            );
        }

        params = params.append(
            'page',
            this._paginator?.pageIndex || PaginationEnum.Page
        );
        params = params.append(
            'size',
            this._paginator?.pageSize || PaginationEnum.Size
        );

        params = params.append('sort', this._sort?.active || SortEnum.Active);
        params = params.append(
            'order',
            this._sort?.direction || SortEnum.Order
        );

        // Get the grupos
        this._grupoService.getGrupos(params).subscribe();
    }

    clearSearchForm() {
        if (!this.isShown) {
            this.simpleSearchFormBuilder();
        } else {
            this.advancedSearchFormBuilder();
        }
    }

    /**
     * On destroy
     */
    // eslint-disable-next-line @angular-eslint/use-lifecycle-interface
    ngOnDestroy(): void {
        // Unsubscribe from all subscriptions
        this._unsubscribeAll.next(null);
        this._unsubscribeAll.complete();
    }

    /**
     * Delete the selected product using the form data
     */
    deleteGrupo(id: number): void {
        // Open the confirmation dialog
        const confirmation = this._fuseConfirmationService.open({
            title: 'Remover Grupo',
            message:
                'Tem certeza que queres remover esta Grupo? Essa acção não pode ser desfeita',
            actions: {
                confirm: {
                    label: 'Remover',
                },
                cancel: {
                    label: 'Cancelar',
                },
            },
        });

        // Subscribe to the confirmation dialog closed action
        confirmation.afterClosed().subscribe((result) => {
            // If the confirm button pressed...
            if (result === 'confirmed') {
                // Create the grupo
                this._grupoService.deleteGrupo(id).subscribe((result) => {
                    // Set the alert
                    this.alert = {
                        type: 'success',
                        message: 'Grupo removido com successo!',
                    };

                    this._fuseAlertService.show('alertBoxUser');
                    this.showAlert = true;
                });
            }
        });
    }

    /**
     * Show flash message
     */
    showFlashMessage(type: 'success' | 'error'): void {
        // Show the message
        this.flashMessage = type;

        // Mark for check
        this._changeDetectorRef.markForCheck();

        // Hide it after 3 seconds
        setTimeout(() => {
            this.flashMessage = null;

            // Mark for check
            this._changeDetectorRef.markForCheck();
        }, 3000);
    }

    /**
     * Create grupos
     */
    createGrupo(grupo: Grupo): void {
        // Create the grupo

        this._grupoService.createGrupo(grupo).subscribe({
            error: (e) => {
                this.alert = {
                    type: 'error',
                    message: `${e.error.message}`,
                };

                this._fuseAlertService.show('alertBoxUser');
                this.showAlert = true;
            },
            complete: () => {
                this.alert = {
                    type: 'success',
                    message: `Grupo <b>${grupo.nome}</b> adicionado com successo!`,
                };

                this._fuseAlertService.show('alertBoxUser');
                this.showAlert = true;

            },
        });
        this.formsBuilder();

        this._grupoService.pagination$
            .pipe(takeUntil(this._unsubscribeAll))
            .subscribe((pagination: InventoryPagination) => {
                // Update the pagination
                this.pagination = pagination;

                // Mark for check
                this._changeDetectorRef.markForCheck();
            });
    }

    /**
     * Create grupo
     */
    updateGrupo(grupo: Grupo): void {
        // Create the grupo
        this._grupoService.updateGrupo(grupo.id, grupo).subscribe({
            error: (e) => {
                this.alert = {
                    type: 'error',
                    message: `${e}`,
                };

                this._fuseAlertService.show('alertBoxUser');
                this.showAlert = true;
            },
            complete: () => {
                this.alert = {
                    type: 'success',
                    message: `Grupo <b>${grupo.nome}</b> actualizado com successo!`,
                };

                this._fuseAlertService.show('alertBoxUser');
                this.showAlert = true;
            },
        });
    }
}
