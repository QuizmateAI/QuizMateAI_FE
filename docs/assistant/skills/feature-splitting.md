# Feature Splitting

## Muc dich

Tach file page hoac component dang qua tai thanh cac phan nho hon, de de doc va de test.

## Khi nao dung

- File vua fetch data vua render nhieu section vua chua nhieu modal
- File qua dai va co nhieu block co the doc lap
- Co logic lap lai giua nhieu component trong cung feature

## Inputs can doc

- File page hien tai trong `src/Pages/`
- Cac component lien quan trong `src/Components/features/`
- Hooks hoac utils dang duoc dung trong file do

## Cach thuc hien

1. Tach page-level orchestration khoi phan UI con.
2. Dua logic lap lai hoac logic khong phu thuoc JSX vao custom hook hoac utility.
3. Dat ten component theo vai tro giao dien, dat ten hook theo hanh vi.
4. Giu props ro nghia, tranh truyen qua nhieu state setter xuong sau.
5. Sau khi tach, doc lai luong data tu tren xuong de dam bao khong mat state quan trong.

## Verify

- Chay test co san cua domain do
- Kiem tra callback, modal state, loading state, empty state
- Kiem tra import tree khong tao vong phu thuoc ro rang

## Dau hieu can dung lai

- Nhieu page trong repo co dau hieu phinh to va can tach theo mot khuon mau giong nhau
