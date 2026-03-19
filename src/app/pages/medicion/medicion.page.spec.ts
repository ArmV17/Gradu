import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MedicionPage } from './medicion.page';

describe('MedicionPage', () => {
  let component: MedicionPage;
  let fixture: ComponentFixture<MedicionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MedicionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
