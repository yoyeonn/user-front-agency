import { TestBed } from '@angular/core/testing';

import { PackInvoiceService } from './pack-invoice.service';

describe('PackInvoiceService', () => {
  let service: PackInvoiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PackInvoiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
