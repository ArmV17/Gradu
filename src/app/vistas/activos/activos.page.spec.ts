import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivosPage } from './activos.page';

describe('ActivosPage', () => {
  let component: ActivosPage;
  let fixture: ComponentFixture<ActivosPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ActivosPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
