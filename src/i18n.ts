export const seo = {
  en: {
    title:
      'Ayaz Zia Ansari | AI Engineer · ML Engineer · Computer Vision Engineer',
    description:
      'AI/ML engineer with hands-on experience across the full model lifecycle, from research and fine-tuning to deployment and operationalisation. Published researcher; DAAD WISE scholar at Universität Ulm.',
  },
};

export const translations = {
  en: {
    greeting: 'who builds applied AI systems',
    greetingRoles: ['AI Engineer', 'ML Engineer', 'Computer Vision Engineer', 'Researcher'],
    pillLabels: ['AI Engineer', 'ML Engineer', 'CV Engineer'],
    email: 'ayazzia01@gmail.com',
    role: '',
    story: {
      context: 'Published researcher turned applied AI engineer.',
      reflections: ['Research to production.', '...now what?'],
      hookParagraphs: [
        ['One day, I beat prior SOTA. I bought *clarity.*'],
        [
          'What drives me goes beyond papers.',
          '*Building* +systems that ship+.',
        ],
      ],
      why: 'At Revalgo AI I migrated the pipeline to VLM-based architecture, stabilised a high-priority product to prevent churn, and led client onboarding. At Markovate I built RAG chatbots, try-on models, voice ordering, and worker safety systems.',
      seeking: [
        'This still feels like day one.',
        'Bigger teams. Harder problems. End-to-end.',
        "Ready for what's next.",
      ],
      nav: [
        { icon: 'briefcase', label: 'My path', href: '#experience' },
        { icon: 'folder', label: 'What I build', href: '#projects' },
        { icon: 'mail', label: "Let's talk", href: '#contact' },
        { icon: 'bot', label: 'Ask me', href: '#chat', highlight: true },
      ],
      skills: [
        'LLM Fine-tuning',
        'Computer Vision',
        'RAG & VLM Pipelines',
        'Azure Deployment',
        'Research-to-Production',
        'Client Ownership',
      ],
      skipButton: 'Skip intro',
    },
    taglines: [] as readonly string[],
    location: 'Bengaluru, India · International remote',
    roles: [
      'AI Engineer',
      'ML Engineer',
      'Computer Vision Engineer',
    ],
    summary: {
      title: 'Professional Summary',
      p1: 'AI/ML engineer with hands-on experience across the full model lifecycle, from ',
      p1Highlight: 'research and fine-tuning to deployment and operationalisation',
      p1End:
        '. Worked with LLMs (prompt engineering, fine-tuning, RAG, VLM pipelines, Azure Foundry) and computer vision (object detection, segmentation, GANs, try-on, safety monitoring). Published research on embryo time-lapse analysis; DAAD WISE research scholar at Universität Ulm.',
      p2: 'Comfortable owning client relationships and stabilising ',
      p2Highlight: 'high-priority products → preventing churn → restoring trust',
      p2End: '. Hands-on across the full lifecycle: research, fine-tuning, RAG, deployment, and client ownership.',
      cards: [
        {
          title: 'Research-to-Production',
          desc: 'Turning papers into working systems: GANs, DETR, U-Net, VLM pipelines',
        },
        {
          title: 'LLM Engineering',
          desc: 'Prompt engineering, fine-tuning, RAG, VLM migration, Azure Foundry deployment',
        },
        {
          title: 'Client Ownership',
          desc: 'Onboarding, stabilising products, preventing churn, leading technical ownership',
        },
      ],
    },
    coreCompetencies: {
      title: 'Core Competencies',
      items: [
        {
          title: 'LLM Engineering',
          desc: 'Prompt engineering, fine-tuning for structured JSON output, RAG with LlamaIndex, VLM pipeline migration',
        },
        {
          title: 'Deployment & Operationalisation',
          desc: 'Azure Foundry, Azure Logic Apps, LLM load-balancing across endpoint regions, deployment and ops',
        },
        {
          title: 'Computer Vision',
          desc: 'Object detection (DETR), segmentation (U-Net, MASS-NET), GANs, medical imaging, try-on models',
        },
        {
          title: 'Research & Publications',
          desc: 'MDPI publication on embryo cell cleavage, DAAD WISE scholar, beating prior SOTA (84% vs 81%)',
        },
        {
          title: 'Client Ownership',
          desc: 'Onboarding newly acquired clients, stabilising high-priority products, preventing churn',
        },
        {
          title: 'End-to-End ML',
          desc: 'From data collection and training to deployment and monitoring: full lifecycle ownership',
        },
      ],
    },
    techStack: {
      title: 'Tech Stack',
      categories: [
        {
          name: 'AI / LLM',
          items: [
            'Prompt Engineering',
            'LLM Fine-tuning',
            'RAG (LlamaIndex)',
            'VLM Pipelines',
            'Azure Foundry',
          ],
        },
        {
          name: 'Computer Vision',
          items: ['TensorFlow', 'Keras', 'OpenCV', 'DETR', 'U-Net', 'GANs', 'GradCam/LIME'],
        },
        {
          name: 'Deployment',
          items: ['Azure Foundry', 'Azure Logic Apps', 'Azure OpenAI'],
        },
        {
          name: 'Programming',
          items: [
            'Python',
            'Java',
            'SQL',
            'NumPy',
            'Pandas',
            'Scikit-learn',
            'Matplotlib',
            'Seaborn',
          ],
        },
        { name: 'Infra', items: ['Vercel'] },
      ],
    },
    projects: {
      title: 'Projects',
      githubLink: 'github.com/Ayazzia01',
      viewCode: 'View code',
      viewPrototype: 'View prototype',
      items: [
        {
          title: 'Revalgo VLM Pipeline Migration',
          badge: 'In production',
          badgeBuilding: '',
          desc: "Migrated Revalgo AI's existing system to a VLM-based pipeline. Fine-tuned LLMs for structured JSON output with self-validation. Deployed via Azure Foundry with Azure Logic Apps workflows.",
          tech: ['LLM', 'VLM', 'Azure Foundry', 'Fine-tuning', 'RAG'],
          link: '',
        },
        {
          title: 'Virtual Try-On Model',
          badge: 'Computer Vision',
          badgeBuilding: '',
          desc: 'Developed a Virtual Try-On model where users upload their photo and change their outfit. Built at Markovate using generative techniques.',
          tech: ['GANs', 'Computer Vision', 'TensorFlow', 'Generative AI'],
          link: '',
        },
        {
          title: 'Voice-Ordering-System (VOS)',
          badge: 'AI Product',
          badgeBuilding: '',
          desc: 'Designed a Voice-Ordering-System for a restaurant where AI takes orders over the phone. End-to-end voice AI pipeline.',
          tech: ['Voice AI', 'NLP', 'Speech Recognition', 'Python'],
          link: '',
        },
        {
          title: 'Worker Safety Detection',
          badge: 'Computer Vision',
          badgeBuilding: '',
          desc: 'Developed worker safety models using object detection for a factory environment. Real-time monitoring of safety compliance.',
          tech: ['Object Detection', 'TensorFlow', 'OpenCV', 'Real-time CV'],
          link: '',
        },
        {
          title: 'Pain Tolerance Classification (DAAD)',
          badge: 'Research',
          badgeBuilding: '',
          desc: 'DAAD WISE Research Scholar at Universität Ulm. Used CNN-LSTMs on Galvanic Skin Response and facial visuals to classify pain tolerance. Achieved 84% accuracy, beating prior work (81%).',
          tech: ['CNN-LSTM', 'GSR', 'Sequential Data', 'Pain Classification'],
          link: '',
        },
        {
          title: 'Embryo Segmentation & Analysis',
          badge: 'Research',
          badgeBuilding: '',
          desc: 'Trained U-Net for embryo image segmentation, implemented MASS-NET for blastocyst segmentation, and developed GANs for data synthesis. Published in MDPI on cell cleavage timing prediction.',
          tech: ['U-Net', 'MASS-NET', 'GANs', 'DETR', 'GradCam', 'Medical Imaging'],
          link: 'https://www.mdpi.com/2504-2289/7/2/91',
        },
        {
          title: 'De-raining using GAN (DID-MDN)',
          badge: 'Academic Project',
          badgeBuilding: '',
          desc: "Implemented the DID-MDN research paper for de-raining of images. Obtained metrics within ±0.5 of the paper's results.",
          tech: ['GANs', 'Image Processing', 'TensorFlow'],
          link: '',
        },
        {
          title: 'Image Super-Resolution (ESRGAN)',
          badge: 'Academic Project',
          badgeBuilding: '',
          desc: 'Implemented the ESRGAN research paper for image super-resolution. Major project for the eighth semester.',
          tech: ['ESRGAN', 'GANs', 'Super-Resolution', 'TensorFlow'],
          link: '',
        },
      ],
    },
    experience: {
      title: 'Work Experience',
      revalgo: {
        company: 'Revalgo AI',
        location: 'Remote',
        role: 'AI Engineer',
        period: 'Jan 2025 - Present',
        highlights: [
          'Prompt engineered LLMs to identify and resolve existing bugs',
          'Fine-tuned LLMs for structured JSON output, including creation, self-validation, and ensuring high-quality training data',
          'Developed a new workflow to migrate from the existing system to a VLM-based pipeline',
          'Handled deployment and operationalisation of LLMs using Azure Foundry and maintained Azure Logic Apps workflows',
          'Implemented highlight feature to map extracted text from PDFs and email',
          'Led onboarding and technical ownership for a newly acquired client',
          'Stabilised a high-priority internal product, restoring client trust and preventing churn',
          'Implemented intelligent LLM load-balancing across multiple Azure OpenAI endpoint regions: random request routing, failure logging, and automatic endpoint lockout after 3 consecutive failures to eliminate peak-hour timeouts',
        ],
      },
      markovate: {
        company: 'Markovate Inc.',
        location: 'Remote',
        role: 'Machine Learning Engineer',
        period: 'Mar 2024 - Dec 2024',
        highlights: [
          'Created an LLM-based RAG chatbot using LlamaIndex',
          'Developed a Virtual Try-On model: upload photo, change outfit',
          'Developed worker safety models using object detection for a factory',
          'Designed a Voice-Ordering-System (VOS) for a restaurant: AI takes orders over phone',
          'Trained a segmentation model for complex civil engineering floor plan sheets',
        ],
      },
      ulm: {
        company: 'Universität Ulm',
        location: 'Ulm, Germany',
        role: 'DAAD WISE Research Scholar',
        period: 'Jun 2023 - Jul 2023',
        highlights: [
          'Worked under Prof. Friedhelm Schwenker as a research scholar',
          'Trained models on sequential data collected from volunteers at university hospital',
          'Used CNN-LSTMs on Galvanic Skin Response (GSR) and facial visuals to classify pain tolerance levels',
          'Results beat the previous work done on the data (81% accuracy); achieved 84% accuracy on the raw data',
        ],
      },
      mixorg: {
        company: 'MixORG',
        location: 'Remote',
        role: 'Computer Vision Intern',
        period: 'Aug 2022 - Jan 2023',
        highlights: [
          'Trained a U-Net for image segmentation of embryo',
          'Developed a Generative Adversarial Network (GAN) to synthesize data',
          'Implemented MASS-NET paper for segmentation of blastocyst',
          'Fine-tuned DETR for object detection',
          'Transferred weights of ResNet-50 backbone from DETR for classification',
          "Used GradCam, LIME and SharpLime to interpret classifier's predictions",
        ],
      },
    },
    speaking: {
      title: 'Accomplishments',
      slides: 'Slides',
      comingSoon: '',
      items: [
        {
          year: '2022',
          event: 'CVIT by IIIT Hyderabad',
          eventUrl: '',
          title: '6th Summer School',
          desc: 'Participated in a research-focused program on recent advancements in AI, Computer Vision, and Machine Learning.',
          pdf: '',
          featured: true,
        },
        {
          year: '2021',
          event: 'e-Yantra Robotics Competition',
          eventUrl: '',
          title: 'Stage 4 (Berryminator)',
          desc: 'Advanced to Stage 4 using object detection technologies for autonomous robot navigation.',
          pdf: '',
          featured: false,
        },
        {
          year: '2021',
          event: 'IEEE JMI Computer Society',
          eventUrl: '',
          title: 'Technical Supervisor',
          desc: 'Head of Technical Departments (DSA, Web Development, ML). Led a team of 15-20 members organizing workshops and hackathons.',
          pdf: '',
          featured: false,
        },
      ],
    },
    education: {
      title: 'Education',
      items: [
        {
          year: '2020 - 2024',
          org: 'Jamia Millia Islamia',
          title: 'B.Tech in Electrical Engineering',
          desc: 'GPA: 8.73/10. Relevant coursework: Data Structures, DBMS, Computer Networks, ADA, Data Mining, NLP & Information Extraction.',
        },
      ],
    },
    publications: {
      title: 'Publications',
      items: [
        {
          year: '2023',
          title: 'Predicting Cell Cleavage Timings from Time-Lapse Videos of Human Embryos',
          org: 'MDPI',
          logo: '',
          url: 'https://www.mdpi.com/2504-2289/7/2/91',
        },
      ],
    },
    skills: {
      title: 'Skills',
      languages: 'Languages',
      english: 'English',
      professional: 'Professional proficiency',
      technical: 'Technical Skills',
      technicalSkills: [
        'Python',
        'Java',
        'SQL',
        'TensorFlow',
        'Keras',
        'Scikit-learn',
        'NumPy',
        'Pandas',
        'Matplotlib',
        'Seaborn',
        'OpenCV',
        'Azure Foundry',
        'Azure Logic Apps',
        'Azure OpenAI',
        'LLM Load-Balancing',
        'LlamaIndex',
        'Prompt Engineering',
        'LLM Fine-tuning',
      ],
      soft: 'Soft Skills',
      softSkills: [
        'Research-to-Production',
        'Client Ownership',
        'Problem Solving',
        'Team Leadership',
        'Technical Communication',
      ],
    },
    cta: {
      title: "Let's talk",
      desc: "I build applied AI systems: LLMs, computer vision, and everything in between. If you have an interesting AI/ML role, I'd love to hear from you.",
      contact: 'Contact',
    },
    ui: {
      typingIndicator: 'Ayaz is typing...',
    },
    chat: {
      placeholder: 'Type your question...',
      title: 'Ayaz',
      subtitle: 'Ask me about my experience',
      greeting:
        "Hi! I'm **@Ayaz**. Ask me anything: AI engineering, computer vision, research, what drives me.",
      error: 'Error sending. Please try again.',
      offline: 'Looks like you\'re offline. Check your connection and try again.',
      prompts: [
        {
          icon: 'briefcase',
          label: 'AI Experience',
          query: "What is Ayaz's experience with AI and LLMs?",
        },
        {
          icon: 'rocket',
          label: 'CV Projects',
          query: "What are Ayaz's most notable computer vision projects?",
        },
        {
          icon: 'help',
          label: 'Why hire him?',
          query: 'Why should I hire Ayaz?',
        },
        {
          icon: 'mail',
          label: 'Contact',
          query: 'How can I contact Ayaz?',
        },
      ],
      contactCtaTitle: 'Want to talk directly?',
    },
  },
} as const;

export type Lang = 'en';