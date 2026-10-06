import { HomeLinks, MessagePage } from "@/components/MessagePage";
import { getCurrentUser } from "@/lib/auth";

export default async function ListNotFound() {
  const user = await getCurrentUser();
  return (
    <MessagePage title="Lista não encontrada" actions={<HomeLinks username={user?.username ?? null} />}>
      <p>
        Confira se o endereço está certo. Também pode ser que a pessoa tenha trocado o nome de usuário ou deixado a
        lista privada.
      </p>
    </MessagePage>
  );
}
