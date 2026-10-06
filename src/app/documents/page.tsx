import { auth } from "@/auth";
import { documentsCollection } from "@/lib/mongodb";
import { AppNav } from "@/components/app-nav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UploadForm } from "./upload-form";
import { DocumentList } from "./document-list";
import { AppointmentPrep } from "./appointment-prep";
import { getUserTimeZone } from "@/lib/user-timezone";

export default async function DocumentsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const timeZone = await getUserTimeZone(userId);

  const docs = await documentsCollection()
    .find({ userId })
    .sort({ createdAt: -1 })
    .toArray();

  const documents = docs.map((doc) => ({
    id: doc._id!.toString(),
    title: doc.title,
    type: doc.type,
    sourceFileUrl: doc.sourceFileUrl,
    createdAt: doc.createdAt.toISOString(),
  }));

  return (
    <div className="min-h-full bg-muted/30">
      <AppNav userEmail={session?.user?.email} />

      <main className="mx-auto max-w-4xl px-6 py-10">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">
          Appointment Prep
        </h1>

        <div className="grid gap-6 md:grid-cols-[1fr_1.2fr]">
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Upload a document
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UploadForm />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-medium">
                  Your documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DocumentList documents={documents} timeZone={timeZone} />
              </CardContent>
            </Card>
          </div>

          <div>
            <h2 className="mb-3 text-base font-medium">Appointment prep</h2>
            <AppointmentPrep />
          </div>
        </div>
      </main>
    </div>
  );
}
