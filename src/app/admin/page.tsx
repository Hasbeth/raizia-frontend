import type { Metadata } from "next";
import { cookies } from "next/headers";
import { getAdminSession } from "@/lib/api";
import { LoginForm } from "@/components/admin/LoginForm";
import { AdminPanel } from "@/components/admin/AdminPanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Administración", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const { configured, admin: loggedIn } = await getAdminSession((await cookies()).toString());
  return (
    <main id="contenido" className="flex-1">
      {loggedIn ? <AdminPanel /> : (
        <div className="container-page py-14 sm:py-20">
          {configured ? <LoginForm /> : (
            <section className="card mx-auto max-w-lg p-7 sm:p-10" aria-labelledby="setup-title">
              <p className="eyebrow">Administración</p>
              <h1 id="setup-title" className="mt-3 font-display text-3xl text-forest-900">Preparemos el acceso</h1>
              <p className="mt-5 leading-relaxed text-muted">Para habilitar el panel, define una contraseña en la variable <code className="break-all rounded bg-sand px-1.5 py-0.5 text-sm text-soil">ADMIN_PASSWORD</code> del archivo <code className="text-soil">.env.local</code>.</p>
              <p className="mt-4 leading-relaxed text-muted">Guarda el archivo y reinicia la aplicación. Luego podrás ingresar aquí para administrar la biblioteca documental.</p>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
