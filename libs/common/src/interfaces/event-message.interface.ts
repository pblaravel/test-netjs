export interface EventMessage<T = Record<string, unknown>> {
  id: string;
  type: string;
  payload: T;
  createdAt: string;
}
