export default function PrivacyPolicy() {
  return (
    <div className="min-h-[80vh] max-w-2xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-display font-bold mb-6">Privacy Policy</h1>
      <p className="text-muted-foreground mb-4">
        This portfolio website uses a chatbot powered by Ollama Cloud. Messages you send to the chatbot are processed to generate responses. No personal data is stored on our servers.
      </p>
      <p className="text-muted-foreground mb-4">
        The chatbot may use RAG (Retrieval-Augmented Generation) with Supabase pgvector to search portfolio content for relevant information.
      </p>
      <p className="text-muted-foreground mb-4">
        Contact: <a href="mailto:ayazzia01@gmail.com" className="text-primary hover:underline">ayazzia01@gmail.com</a>
      </p>
    </div>
  )
}