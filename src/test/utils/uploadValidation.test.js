import { describe, it, expect } from 'vitest';
import {
  AVATAR_ACCEPT_ATTR,
  AVATAR_MAX_BYTES,
  AVATAR_MIME_WHITELIST,
  MATERIAL_ACCEPT_ATTR,
  isAvatarMimeAllowed,
  isMaterialMimeAllowed,
  validateAvatarFile,
  validateMaterialFile,
} from '@/utils/uploadValidation';

function makeFile({ type = '', name = 'sample', size = 1024 } = {}) {
  return { type, name, size };
}

describe('avatar validation', () => {
  it('accepts BE whitelist MIME types', () => {
    AVATAR_MIME_WHITELIST.forEach((mime) => {
      expect(isAvatarMimeAllowed(mime)).toBe(true);
    });
  });

  it('rejects SVG (explicit BE exclusion)', () => {
    expect(isAvatarMimeAllowed('image/svg+xml')).toBe(false);
  });

  it('rejects non-image MIME', () => {
    expect(isAvatarMimeAllowed('application/pdf')).toBe(false);
    expect(isAvatarMimeAllowed('')).toBe(false);
  });

  it('validateAvatarFile flags invalid type', () => {
    const result = validateAvatarFile(makeFile({ type: 'image/svg+xml' }));
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_TYPE');
  });

  it('validateAvatarFile flags oversize', () => {
    const result = validateAvatarFile(makeFile({ type: 'image/png', size: AVATAR_MAX_BYTES + 1 }));
    expect(result.ok).toBe(false);
    expect(result.code).toBe('TOO_LARGE');
  });

  it('validateAvatarFile passes valid file', () => {
    const result = validateAvatarFile(makeFile({ type: 'image/jpeg', size: 100 * 1024 }));
    expect(result.ok).toBe(true);
  });

  it('validateAvatarFile flags missing file', () => {
    expect(validateAvatarFile(null).ok).toBe(false);
    expect(validateAvatarFile(undefined).ok).toBe(false);
  });

  it('exposes accept attr for input element', () => {
    expect(AVATAR_ACCEPT_ATTR).toContain('image/jpeg');
    expect(AVATAR_ACCEPT_ATTR).toContain('image/gif');
    expect(AVATAR_ACCEPT_ATTR).not.toContain('image/svg');
  });
});

describe('material validation', () => {
  it('accepts OOXML modern formats', () => {
    expect(isMaterialMimeAllowed('application/pdf')).toBe(true);
    expect(isMaterialMimeAllowed('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(true);
    expect(isMaterialMimeAllowed('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe(true);
    expect(isMaterialMimeAllowed('application/vnd.openxmlformats-officedocument.presentationml.presentation')).toBe(true);
    expect(isMaterialMimeAllowed('text/plain')).toBe(true);
  });

  it('rejects legacy formats (.doc/.xls/.ppt) — BE whitelist OOXML only', () => {
    expect(isMaterialMimeAllowed('application/msword')).toBe(false);
    expect(isMaterialMimeAllowed('application/vnd.ms-excel')).toBe(false);
    expect(isMaterialMimeAllowed('application/vnd.ms-powerpoint')).toBe(false);
  });

  it('accepts image/audio/video prefix', () => {
    expect(isMaterialMimeAllowed('image/jpeg')).toBe(true);
    expect(isMaterialMimeAllowed('image/svg+xml')).toBe(true);
    expect(isMaterialMimeAllowed('audio/mpeg')).toBe(true);
    expect(isMaterialMimeAllowed('video/mp4')).toBe(true);
  });

  it('rejects unknown MIME', () => {
    expect(isMaterialMimeAllowed('application/x-msdownload')).toBe(false);
    expect(isMaterialMimeAllowed('')).toBe(false);
  });

  it('validateMaterialFile falls back to extension when file.type is empty', () => {
    const result = validateMaterialFile(makeFile({ type: '', name: 'slides.pptx' }));
    expect(result.ok).toBe(true);
  });

  it('validateMaterialFile flags unknown extension when type empty', () => {
    const result = validateMaterialFile(makeFile({ type: '', name: 'virus.exe' }));
    expect(result.ok).toBe(false);
    expect(result.code).toBe('INVALID_TYPE');
  });

  it('validateMaterialFile flags spoofed application/x-msdownload', () => {
    const result = validateMaterialFile(makeFile({ type: 'application/x-msdownload', name: 'doc.pdf' }));
    expect(result.ok).toBe(false);
  });

  it('exposes accept attr with modern extensions only', () => {
    expect(MATERIAL_ACCEPT_ATTR).toContain('.docx');
    expect(MATERIAL_ACCEPT_ATTR).not.toContain('.doc,');
    expect(MATERIAL_ACCEPT_ATTR).not.toContain('.xls,');
    expect(MATERIAL_ACCEPT_ATTR).not.toContain('.ppt,');
  });
});
