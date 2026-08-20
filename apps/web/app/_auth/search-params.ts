/**
 * The shape Next hands a page for `?a=b`.
 *
 * One name rather than the four hand-written copies it replaced. It is a `Promise` because Next 16
 * makes reading it a request-time access — and the pages that take it deliberately **forward it
 * unawaited** into a `<Suspense>` boundary, so that awaiting it pulls only that subtree out of the
 * prerender rather than the whole route.
 */
export type SearchParams = Promise<Record<string, string | string[] | undefined>>;
