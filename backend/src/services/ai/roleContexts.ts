export interface ResolvedRoleContext {
  currentAffairsFocus: boolean;
  customRole?: string;
  focusAreas: string[];
  followUpStyle: string;
  interviewerPersona: string;
  resolvedCategory: string;
  role: string;
  stageOverrides: Partial<Record<string, string[]>>;
  subRole?: string;
  tone: string[];
}

interface RoleBlueprint {
  currentAffairsFocus?: boolean;
  focusAreas: string[];
  followUpStyle: string;
  interviewerPersona: string;
  stageOverrides?: Partial<Record<string, string[]>>;
  tone: string[];
}

interface SubRoleContext {
  focusAreas: string[];
  interviewerPersona?: string;
}

const BASE_ROLE_CONTEXTS: Record<string, RoleBlueprint> = {
  UPSC: {
    currentAffairsFocus: true,
    focusAreas: [
      'governance, public policy, and constitutional understanding',
      'ethics, integrity, and decision making under pressure',
      'current affairs with analytical depth',
      'personality, motivation for public service, and balanced judgment',
    ],
    followUpStyle: 'Probe analytical depth, ethical reasoning, and clarity of thought like a real UPSC board.',
    interviewerPersona:
      'You are a serious UPSC board interviewer evaluating administrative maturity, ethics, awareness, and personality.',
    stageOverrides: {
      Introduction: [
        'motivation for civil services',
        'background, education, and preparation journey',
      ],
      Technical: [
        'governance, policy implementation, and constitutional understanding',
        'ethical dilemmas and public administration reasoning',
      ],
      Scenario: [
        'administrative decision making under political, social, or ethical pressure',
      ],
      HR: [
        'temperament, public service attitude, leadership, and self-awareness',
      ],
    },
    tone: ['serious', 'analytical', 'professional'],
  },
  'State PSC': {
    currentAffairsFocus: true,
    focusAreas: [
      'state governance and administrative structure',
      'regional development, public delivery, and local governance',
      'state-specific current affairs, geography, economy, history, and culture',
      'candidate temperament for district and state administration roles',
    ],
    followUpStyle:
      'Probe regional awareness, practical administrative judgment, and how the candidate thinks about state-level challenges.',
    interviewerPersona:
      'You are a State PSC board interviewer assessing regional governance awareness, administrative temperament, and public service readiness.',
    stageOverrides: {
      Technical: [
        'state administrative structure, district governance, schemes, and regional issues',
      ],
      Scenario: [
        'district administration, local conflict resolution, welfare delivery, and state policy execution',
      ],
    },
    tone: ['professional', 'regional-context aware', 'analytical'],
  },
  SSC: {
    focusAreas: [
      'aptitude, reasoning, and structured problem solving',
      'clear communication and basic general awareness',
      'situational judgement in entry-level government or office roles',
      'discipline, consistency, and ability to follow process',
    ],
    followUpStyle:
      'Keep the questions crisp, practical, and slightly escalating in difficulty while checking clarity and reasoning.',
    interviewerPersona:
      'You are an SSC interviewer checking reasoning, communication, awareness, and workplace judgement.',
    stageOverrides: {
      Technical: [
        'aptitude, reasoning, numerical comfort, and communication fundamentals',
      ],
      Scenario: ['office discipline, process adherence, and situational judgement'],
    },
    tone: ['clear', 'practical', 'structured'],
  },
  Banking: {
    currentAffairsFocus: true,
    focusAreas: [
      'banking awareness, finance, and economic literacy',
      'customer handling, trust, and service orientation',
      'reasoning, business judgement, and risk awareness',
      'HR interview depth for branch, regulatory, or finance-oriented roles',
    ],
    followUpStyle:
      'Probe practical banking judgement, customer-facing maturity, and financial understanding with realistic branch or policy scenarios.',
    interviewerPersona:
      'You are a professional banking panel interviewer evaluating financial awareness, customer judgement, and role readiness.',
    stageOverrides: {
      Technical: [
        'banking products, financial awareness, regulation, economic developments, and exam-specific concepts',
      ],
      Scenario: ['customer handling, compliance, fraud awareness, service recovery, and branch judgement'],
    },
    tone: ['professional', 'commercially aware', 'composed'],
  },
  Custom: {
    focusAreas: [
      'role-specific knowledge and real execution ability',
      'project depth, ownership, and decision making',
      'problem solving, trade-offs, and communication',
      'career motivation and ability to operate in the chosen domain',
    ],
    followUpStyle:
      'Act like a domain specialist interviewer who probes resume claims, real decisions, and practical depth.',
    interviewerPersona:
      'You are a domain-specific interviewer for the selected custom role. Ask realistic professional questions.',
    stageOverrides: {
      Technical: ['domain-specific depth, execution, architecture, tools, and trade-offs'],
      Scenario: ['practical problem solving and role-specific decision making'],
    },
    tone: ['professional', 'role-specific', 'insightful'],
  },
};

const STATE_PSC_SUB_CONTEXTS: Record<string, SubRoleContext> = {
  'Assam PSC': {
    focusAreas: [
      'Assam administration, district governance, and public service delivery',
      'Assam economy including tea, oil, agriculture, and connectivity',
      'Assam geography, flood management, border context, and the Northeast',
      'Assam history, culture, language diversity, and current regional issues',
    ],
  },
  WBPSC: {
    focusAreas: [
      'West Bengal governance, district administration, and municipal systems',
      'West Bengal economy, industry, ports, agriculture, and social development',
      'West Bengal geography, river systems, culture, and political-administrative context',
      'state-specific schemes, local current affairs, and governance challenges',
    ],
  },
  BPSC: {
    focusAreas: [
      'Bihar administration, district governance, and welfare implementation',
      'Bihar economy, agriculture, migration, infrastructure, and social indicators',
      'Bihar history, geography, polity, and local development issues',
      'state-specific schemes and practical governance challenges',
    ],
  },
  APPSC: {
    focusAreas: [
      'Andhra Pradesh administration, local governance, and policy delivery',
      'Andhra economy, ports, agriculture, industries, and regional development',
      'state geography, irrigation, capital region concerns, and current affairs',
      'state-specific welfare and administrative priorities',
    ],
  },
  UPPSC: {
    focusAreas: [
      'Uttar Pradesh governance, law and order, and district administration',
      'UP economy, agriculture, manufacturing, and population-scale governance',
      'UP geography, culture, social issues, and regional disparities',
      'state schemes, development policy, and local current affairs',
    ],
  },
  MPPSC: {
    focusAreas: [
      'Madhya Pradesh administration, tribal development, and district governance',
      'MP economy, agriculture, natural resources, and infrastructure',
      'MP geography, forests, culture, and regional development concerns',
      'state welfare delivery and current affairs',
    ],
  },
  'Kerala PSC': {
    focusAreas: [
      'Kerala governance, decentralization, and local self-government',
      'Kerala economy, health, education, tourism, and social development',
      'Kerala geography, culture, diaspora influence, and public policy challenges',
      'state current affairs and administrative best practices',
    ],
  },
  TNPSC: {
    focusAreas: [
      'Tamil Nadu governance, state administration, and welfare delivery',
      'Tamil Nadu economy, industry, manufacturing, agriculture, and services',
      'Tamil Nadu geography, history, culture, and social development',
      'state-specific current affairs and policy implementation',
    ],
  },
  OPSC: {
    focusAreas: [
      'Odisha administration, disaster governance, and district-level execution',
      'Odisha economy, mining, agriculture, coastline, and industrial development',
      'Odisha geography, culture, tribal issues, and governance challenges',
      'state current affairs and welfare delivery',
    ],
  },
  MPSC: {
    focusAreas: [
      'Maharashtra administration, urban-rural governance, and district systems',
      'Maharashtra economy, industry, agriculture, finance, and infrastructure',
      'Maharashtra geography, culture, cooperative structures, and regional issues',
      'state-specific schemes and current affairs',
    ],
  },
};

const BANKING_SUB_CONTEXTS: Record<string, SubRoleContext> = {
  'SBI PO': {
    focusAreas: [
      'branch leadership, banking operations, and customer relationship handling',
      'retail banking products, sales orientation, and operational compliance',
      'credit awareness, service quality, and team management judgement',
    ],
  },
  'SBI Clerk': {
    focusAreas: [
      'front-office customer service, account operations, and transaction accuracy',
      'cash handling, routine banking processes, and customer communication',
      'service quality, compliance discipline, and operational reliability',
    ],
  },
  'IBPS PO': {
    focusAreas: [
      'probationary officer responsibilities, banking products, and customer management',
      'credit basics, branch operations, targets, and service judgement',
      'reasoning, professionalism, and people management readiness',
    ],
  },
  'IBPS Clerk': {
    focusAreas: [
      'customer-facing banking operations, documentation, and transaction processes',
      'service discipline, branch coordination, and process accuracy',
      'communication, reliability, and basic banking awareness',
    ],
  },
  'RBI Grade B': {
    focusAreas: [
      'monetary policy, macroeconomics, inflation, and financial regulation',
      'banking supervision, RBI functions, and economic current affairs',
      'financial stability, governance, and policy reasoning',
    ],
  },
  NABARD: {
    focusAreas: [
      'rural banking, agriculture finance, and development institutions',
      'financial inclusion, rural infrastructure, and credit policy',
      'economic development, policy execution, and institutional judgement',
    ],
  },
  'LIC AAO': {
    focusAreas: [
      'insurance operations, policy servicing, and customer trust',
      'financial products, claims awareness, and risk sensitivity',
      'communication, regulatory discipline, and service orientation',
    ],
  },
};

function buildCustomRoleContext(customRole: string): RoleBlueprint {
  return {
    ...BASE_ROLE_CONTEXTS.Custom,
    focusAreas: [
      `${customRole} core responsibilities, workflows, and expertise`,
      `${customRole} project depth, tools, and decision making`,
      `${customRole} problem solving, trade-offs, and execution quality`,
      `${customRole} communication, ownership, and team impact`,
    ],
    interviewerPersona: `You are a highly credible ${customRole} interviewer conducting a realistic professional interview.`,
  };
}

function pickSubRoleContext(role: string, subRole?: string) {
  if (!subRole) {
    return null;
  }

  if (role === 'State PSC') {
    return STATE_PSC_SUB_CONTEXTS[subRole] ?? null;
  }

  if (role === 'Banking') {
    return BANKING_SUB_CONTEXTS[subRole] ?? null;
  }

  return null;
}

export function resolveRoleContext(input: {
  customRole?: string;
  role: string;
  subRole?: string;
}): ResolvedRoleContext {
  const role = input.role || 'Custom';
  const subRole = input.subRole?.trim() || undefined;
  const customRole = input.customRole?.trim() || undefined;
  const baseContext =
    role === 'Custom' && customRole
      ? buildCustomRoleContext(customRole)
      : BASE_ROLE_CONTEXTS[role] ?? BASE_ROLE_CONTEXTS.Custom;
  const subRoleContext = pickSubRoleContext(role, subRole);
  const resolvedCategory =
    role === 'Custom'
      ? customRole || 'General Interview'
      : subRole
        ? `${role} - ${subRole}`
        : role;

  return {
    currentAffairsFocus: Boolean(baseContext.currentAffairsFocus),
    customRole,
    focusAreas: [...baseContext.focusAreas, ...(subRoleContext?.focusAreas ?? [])],
    followUpStyle: baseContext.followUpStyle,
    interviewerPersona: subRoleContext?.interviewerPersona ?? baseContext.interviewerPersona,
    resolvedCategory,
    role,
    stageOverrides: baseContext.stageOverrides ?? {},
    subRole,
    tone: baseContext.tone,
  };
}
