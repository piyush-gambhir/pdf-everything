export class PdfCoreError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'PdfCoreError';
  }
}

export class InvalidPdfError extends PdfCoreError {
  constructor(detail?: string) {
    super(detail ?? 'The provided file is not a valid PDF', 'INVALID_PDF');
    this.name = 'InvalidPdfError';
  }
}

export class PageOutOfRangeError extends PdfCoreError {
  constructor(page: number, totalPages: number) {
    super(`Page ${page} is out of range (1..${totalPages})`, 'PAGE_OUT_OF_RANGE');
    this.name = 'PageOutOfRangeError';
  }
}

export class EmptyInputError extends PdfCoreError {
  constructor(detail = 'At least one input PDF is required') {
    super(detail, 'EMPTY_INPUT');
    this.name = 'EmptyInputError';
  }
}
