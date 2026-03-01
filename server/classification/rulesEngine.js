const ART5_PROVISIONS = {
  usesSubliminalTechniques: { ref: 'Art. 5(1)(a)', label: 'Deploys subliminal techniques beyond a person\'s consciousness to materially distort behaviour' },
  exploitsVulnerabilities: { ref: 'Art. 5(1)(b)', label: 'Exploits vulnerabilities of specific groups (age, disability, social/economic situation)' },
  createsSocialScore: { ref: 'Art. 5(1)(c)', label: 'Social scoring by public authorities or on their behalf' },
  assessesCriminalRiskByProfilingOnly: { ref: 'Art. 5(1)(d)', label: 'Assesses risk of criminal offence based solely on profiling or personality traits' },
  createsFacialRecognitionDatabase: { ref: 'Art. 5(1)(e)', label: 'Creates or expands facial recognition databases through untargeted scraping' },
  infersEmotionsAtWorkOrSchool: { ref: 'Art. 5(1)(f)', label: 'Infers emotions in the workplace or educational institutions' },
  biometricCategorisesByProtectedAttributes: { ref: 'Art. 5(1)(g)', label: 'Biometric categorisation to deduce race, political opinions, religion, sexual orientation' },
  isRealTimeRBILawEnforcement: { ref: 'Art. 5(1)(h)', label: 'Real-time remote biometric identification in publicly accessible spaces for law enforcement' },
};

const ANNEX3_DOMAINS = {
  isRemoteBiometricID: { domain: '1', ref: 'Annex III, 1(a)', label: 'Remote biometric identification (not real-time)' },
  isEmotionRecognition: { domain: '1', ref: 'Annex III, 1(b)', label: 'Emotion recognition systems' },
  isBiometricCategorisation: { domain: '1', ref: 'Annex III, 1(c)', label: 'Biometric categorisation systems' },
  isRecruitmentOrHrDecisions: { domain: '4', ref: 'Annex III, 4(a)', label: 'Recruitment or selection of natural persons (CV screening, filtering, evaluating)' },
  isPerformanceManagement: { domain: '4', ref: 'Annex III, 4(b)', label: 'Performance monitoring and evaluation of employees' },
  isCreditScoring: { domain: '5', ref: 'Annex III, 5(b)', label: 'Creditworthiness assessment of natural persons (credit scoring)' },
  isInsuranceRiskPricing: { domain: '5', ref: 'Annex III, 5(c)', label: 'Risk assessment and pricing for life and health insurance' },
  isPublicBenefitsEligibility: { domain: '5', ref: 'Annex III, 5(a)', label: 'Evaluate eligibility for public assistance benefits and services' },
  isLawEnforcement: { domain: '6', ref: 'Annex III, 6(a)', label: 'AI systems used by law enforcement' },
  isBorderControl: { domain: '7', ref: 'Annex III, 7(a)', label: 'Migration, asylum, and border control management' },
  isEducationAdmissions: { domain: '3', ref: 'Annex III, 3(a)', label: 'Education and vocational training — admissions or assessment' },
  isJudicialAdministration: { domain: '8', ref: 'Annex III, 8(a)', label: 'Administration of justice and democratic processes' },
  isElectionInfluence: { domain: '8', ref: 'Annex III, 8(b)', label: 'AI systems intended to influence elections' },
  isCriticalInfrastructure: { domain: '2', ref: 'Annex III, 2(a)', label: 'Safety components of critical infrastructure (energy, transport, water, gas, heating, internet)' },
};

export function checkProhibitedPractices(facts) {
  const matchedProvisions = [];
  const flags = [];

  if (!facts.art5Responses) {
    return { isProhibited: false, matchedProvisions, flags };
  }

  for (const [key, value] of Object.entries(facts.art5Responses)) {
    if (value === true && ART5_PROVISIONS[key]) {
      matchedProvisions.push({
        key,
        articleRef: ART5_PROVISIONS[key].ref,
        label: ART5_PROVISIONS[key].label,
      });
      flags.push(`PROHIBITED_${key.toUpperCase()}`);
    }
  }

  return {
    isProhibited: matchedProvisions.length > 0,
    matchedProvisions,
    flags,
  };
}

export function checkAIDefinition(facts) {
  if (facts.systemType === 'rules_based') {
    return {
      possiblyExcluded: true,
      reason: 'System is described as rules-based. The AI Act definition in Article 3(1) may not cover purely rules-based systems without inference or learning capabilities. Legal review is recommended.',
    };
  }
  return { possiblyExcluded: false, reason: null };
}

export function checkAnnexIII(facts) {
  const matchedDomains = [];
  const matchDetails = {};

  if (!facts.annex3Responses) {
    return { anyMatch: false, matchedDomains, matchDetails };
  }

  for (const [key, value] of Object.entries(facts.annex3Responses)) {
    if (key === 'isCreditFraudDetection') continue;

    if (value === true && ANNEX3_DOMAINS[key]) {
      if (key === 'isCreditScoring' && facts.annex3Responses.isCreditFraudDetection === true) {
        matchDetails[key] = {
          matched: false,
          reason: 'Credit scoring exception: isCreditFraudDetection is true, so domain 5(b) does NOT apply',
          domain: ANNEX3_DOMAINS[key],
        };
        continue;
      }

      matchedDomains.push({
        key,
        domain: ANNEX3_DOMAINS[key].domain,
        ref: ANNEX3_DOMAINS[key].ref,
        label: ANNEX3_DOMAINS[key].label,
      });
      matchDetails[key] = {
        matched: true,
        domain: ANNEX3_DOMAINS[key],
      };
    }
  }

  return {
    anyMatch: matchedDomains.length > 0,
    matchedDomains,
    matchDetails,
  };
}

export function checkDerogation(facts) {
  const flags = [];

  if (!facts.art6_3Responses) {
    return { profilingDetected: false, derogationPossible: false, flags };
  }

  const { performsProfilingOfPersons, materiallyInfluencesDecisionOutcome, humanMakesFinalDecision, consequenceOfIncorrectOutput } = facts.art6_3Responses;

  if (performsProfilingOfPersons === true) {
    flags.push('PROFILING_DETECTED');
    return {
      profilingDetected: true,
      derogationPossible: false,
      flags,
      reason: 'Systems that profile natural persons are always high-risk regardless of other exemption criteria (Article 6(3), final paragraph).',
    };
  }

  const lowConsequence = consequenceOfIncorrectOutput === 'NONE' || consequenceOfIncorrectOutput === 'LOW';
  const humanDecision = humanMakesFinalDecision === true;
  const notMaterial = materiallyInfluencesDecisionOutcome === false;

  const derogationPossible = lowConsequence && humanDecision && notMaterial;

  if (derogationPossible) {
    flags.push('ART6_3_DEROGATION_POSSIBLE');
  }

  return {
    profilingDetected: false,
    derogationPossible,
    flags,
    reason: derogationPossible
      ? 'Art. 6(3) conditions met: low consequence, human final decision, output does not materially influence outcome. Classification may be downgraded from HIGH_RISK.'
      : 'Art. 6(3) derogation conditions not fully met. System remains HIGH_RISK.',
  };
}

export function checkRoleDetermination(facts) {
  const flags = [];

  if (!facts.roleResponses) {
    return { primaryRole: 'DEPLOYER', providerRisk: false, flags };
  }

  const { builtInhouse, purchasedNoCustomisation, significantlyCustomised, accessedViaAPIInOwnProduct } = facts.roleResponses;

  let primaryRole = 'DEPLOYER';
  let providerRisk = false;

  if (builtInhouse) {
    primaryRole = 'PROVIDER';
    providerRisk = true;
  } else if (significantlyCustomised) {
    primaryRole = 'PROVIDER_UNDER_ART25';
    providerRisk = true;
    flags.push('ROLE_AMBIGUITY');
  } else if (accessedViaAPIInOwnProduct) {
    primaryRole = 'PROVIDER_UNDER_ART25';
    providerRisk = true;
    flags.push('ROLE_AMBIGUITY');
  } else if (purchasedNoCustomisation) {
    primaryRole = 'DEPLOYER';
  }

  return { primaryRole, providerRisk, flags };
}

export function runClassificationTree(facts) {
  const flags = [];

  const step1 = checkProhibitedPractices(facts);
  if (step1.isProhibited) {
    return {
      step1_prohibition: step1,
      step2_definition: null,
      step3_annexIII: null,
      step4_derogation: null,
      step5_role: null,
      finalClassification: 'PROHIBITED',
      requiresLegalReview: true,
      flags: [...step1.flags],
    };
  }

  const step2 = checkAIDefinition(facts);
  if (step2.possiblyExcluded) {
    flags.push('AI_DEFINITION_CONTESTED');
  }

  const step3 = checkAnnexIII(facts);

  let step4 = null;
  if (step3.anyMatch) {
    step4 = checkDerogation(facts);
    flags.push(...step4.flags);
  }

  const step5 = checkRoleDetermination(facts);
  flags.push(...step5.flags);

  let finalClassification;
  let requiresLegalReview = false;

  if (step2.possiblyExcluded) {
    finalClassification = 'CLASSIFICATION_CONTESTED';
    requiresLegalReview = true;
  } else if (step3.anyMatch) {
    if (step4 && step4.derogationPossible) {
      finalClassification = 'CLASSIFICATION_CONTESTED';
      requiresLegalReview = true;
    } else {
      finalClassification = 'HIGH_RISK';
    }
  } else {
    finalClassification = 'LIMITED_OR_MINIMAL_RISK';
  }

  if (step5.flags.includes('ROLE_AMBIGUITY')) {
    requiresLegalReview = true;
  }

  return {
    step1_prohibition: step1,
    step2_definition: step2,
    step3_annexIII: step3,
    step4_derogation: step4,
    step5_role: step5,
    finalClassification,
    requiresLegalReview,
    flags,
  };
}
