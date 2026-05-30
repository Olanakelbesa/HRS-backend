import { resyncAllPropertyEmbeddings } from '../search/repository';

export async function resyncAllEmbeddings() {
  return resyncAllPropertyEmbeddings();
}
