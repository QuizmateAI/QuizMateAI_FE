# Performance Budget Check

## Muc dich

Dat budget va cach verify cho cac first-load flow nhu vao web lan dau, login -> home, va tao workspace lan dau.

## Khi nao dung

- Task nhac toi toc do hien thi trang
- Task nhac toi cold start, first use, perceived performance
- Task lien quan lazy loading, preload, locale payload, initial fetch
- Task can tra loi ro cai gi dang pass, cai gi dang fail, va sua tiep o dau

## Inputs can doc

- `docs/assistant/instructions/performance-levels.md`
- `src/App.jsx`
- `src/lib/routeLoaders.js`
- `src/i18n/index.js`
- `scripts/check-bundle-budget.mjs`
- `src/test/performance/`
- `src/test/manual/`

## Cach thuc hien

1. Xac dinh flow first-use can do va gan moi flow voi page, route chunk, va API chinh.
2. Dat 3 lop budget:
   - route chunk budget
   - first feedback budget
   - route ready budget
3. Them automated checks cho chunk budget va perf invariant trong repo.
4. Them manual test case cho browser timing that.
5. Chay build, bundle budget, va test perf lien quan.
6. Neu fail, tach fail theo nhom:
   - chunk qua lon
   - locale payload qua lon
   - eager fetch sai tab/view
   - background invalidate dang block navigation
   - panel hoac tab nang bi mount qua som

## Verify

- `npm run build`
- `npm run check:bundle-budget`
- `npx vitest run src/test/performance`
- Co execution report ghi ro pass/fail va ke hoach sua

## Dau hieu can dung lai

- Moi task lien quan first visit, login nhanh, create workspace nhanh
- Moi task can lap budget truoc khi toi uu man hinh nang
