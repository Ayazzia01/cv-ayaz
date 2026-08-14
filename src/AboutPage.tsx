export default function AboutPage() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6">
      <h1 className="text-3xl font-display font-bold mb-4">Ayaz Zia Ansari</h1>
      <p className="text-muted-foreground max-w-md mb-6">
        AI/ML engineer with hands-on experience across the full model lifecycle. 
        Published researcher (MDPI); DAAD WISE scholar at Universität Ulm.
      </p>
      <div className="flex gap-4">
        <a href="mailto:ayazzia01@gmail.com" className="text-primary hover:underline">ayazzia01@gmail.com</a>
        <a href="https://linkedin.com/in/ayazziaansari" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">LinkedIn</a>
        <a href="https://github.com/Ayazzia01" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">GitHub</a>
      </div>
    </div>
  )
}