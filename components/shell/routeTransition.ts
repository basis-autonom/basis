export const BASIS_ROUTE_TRANSITION_EVENT = 'basis:route-transition-start';

export function startBasisRouteTransition(pathname?: string) {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(
    new CustomEvent(BASIS_ROUTE_TRANSITION_EVENT, {
      detail: { pathname },
    }),
  );
}
