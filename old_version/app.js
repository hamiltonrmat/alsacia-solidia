// InstructOCR Prototype Main Controller
document.addEventListener("DOMContentLoaded", () => {
  
  // ==========================================
  // 1. STATE MANAGEMENT
  // ==========================================
  
  const state = {
    // Current active tab
    activeTab: "tab-chargement",

    // ---- Simulation des lots de numérisation ----
    // 3 lots : 2 vides, 1 contenant 2 dossiers (dont un seul est chargeable)
    lots: [
      {
        id: "lot-2345",
        name: "Lot #2345",
        date: "28/06/2026",
        source: "Scanner — Hôtel du Département",
        dossiers: []
      },
      {
        id: "lot-2347",
        name: "Lot #2347",
        date: "01/07/2026",
        source: "Scanner — Espace Autonomie Strasbourg",
        dossiers: [
          {
            id: "dossier-3",
            name: "Dossier #3",
            usager: "Demande APA — usager présumé « DUPONT »",
            pages: 6,
            size: "2,4 Mo",
            status: "available"
          },
          {
            id: "dossier-4",
            name: "Dossier #4",
            usager: "Demande APA — usager non identifié",
            pages: 9,
            size: "3,1 Mo",
            status: "locked",
            lockedNote: "Verrouillé — en cours d'instruction"
          }
        ]
      },
      {
        id: "lot-2351",
        name: "Lot #2351",
        date: "02/07/2026",
        source: "Courrier entrant — Antenne de Sélestat",
        dossiers: []
      }
    ],

    // Lot mis en avant dans l'étape de chargement
    selectedLotId: "lot-2347",

    // Dossier effectivement chargé dans le poste de travail ({ lotName, dossier } ou null)
    loadedDossier: null,

    // Page splitting status (true = split is active below this page index)
    // There are 6 pages, so 5 potential split points between pages (indexes 0 to 4 correspond to spaces between pages 1-2, 2-3, 3-4, 4-5, 5-6)
    splits: [false, false, false, true, true], // Default splits: Page 4 (index 3) and Page 5 (index 4)
    
    // Extracted OCR Data (with initial errors)
    ocrData: {
      cerfa: {
        title: "Demande APA (CERFA)",
        fields: [
          { id: "cerfa-sexe", label: "Sexe", value: "Monsieur", score: 99, status: "ok" },
          { id: "cerfa-nom", label: "Nom de naissance", value: "D_PO_T", score: 65, status: "warning", errorMsg: "Coquille détectée (caractères manquants ou mal lus)" },
          { id: "cerfa-prenom", label: "Prénom(s)", value: "Jean", score: 99, status: "ok" },
          { id: "cerfa-naissance", label: "Date de naissance", value: "12/07/1951", score: 98, status: "ok" },
          { id: "cerfa-nir", label: "Numéro de sécurité sociale (NIR)", value: "1510767012345", score: 96, status: "ok" },
          { id: "cerfa-adresse", label: "Adresse", value: "12 Rue de la Paix", score: 95, status: "ok" },
          { id: "cerfa-ville", label: "Ville", value: "Strasbourg", score: 97, status: "ok" }
        ],
        zoomSnippets: {
          "cerfa-sexe": "Votre Sexe : [ ] Madame [X] **Monsieur**",
          "cerfa-nom": "Nom de naissance : **D_PO_T**",
          "cerfa-prenom": "Prénom(s) : **Jean**",
          "cerfa-naissance": "Date de naissance : **12 / 07 / 1951**",
          "cerfa-nir": "Numéro d'inscription au répertoire (NIR) : **1 51 07 67 012 345**",
          "cerfa-adresse": "Adresse : **12 Rue de la Paix**",
          "cerfa-ville": "Commune : **Strasbourg**"
        }
      },
      cni: {
        title: "Carte d'Identité (CNI)",
        fields: [
          { id: "cni-nom", label: "Nom de famille", value: "MARTIN", score: 98, status: "ok" },
          { id: "cni-prenom", label: "Prénoms", value: "Maëlys Clara", score: 99, status: "ok" },
          { id: "cni-sexe", label: "Sexe", value: "F", score: 99, status: "ok" },
          { id: "cni-naissance", label: "Date de naissance", value: "13/07/1990", score: 98, status: "ok" },
          { id: "cni-expiration", label: "Date d'expiration", value: "15/09/2024", score: 95, status: "ok" }
        ],
        zoomSnippets: {
          "cni-nom": "Nom / Surname : **MARTIN**",
          "cni-prenom": "Prénoms / Given names : **Maëlys Clara**",
          "cni-sexe": "Sexe / Sex : **F**",
          "cni-naissance": "Né(e) le / Date of birth : **13.07.1990**",
          "cni-expiration": "Date d'expiration / Expiry date : **15.09.2024**"
        }
      },
      cm: {
        title: "Certificat Médical",
        fields: [
          { id: "cm-patient", label: "Nom du patient", value: "Jean DUPONT", score: 98, status: "ok" },
          { id: "cm-naissance", label: "Date de naissance", value: "12/07/1951", score: 99, status: "ok" },
          { id: "cm-date", label: "Date d'établissement", value: "15/06/2026", score: 97, status: "ok" },
          { id: "cm-gir", label: "Niveau de GIR diagnostiqué", value: "GIR 2", score: 99, status: "ok" }
        ],
        zoomSnippets: {
          "cm-patient": "certifie avoir examiné ce jour : Monsieur **Jean DUPONT**",
          "cm-naissance": "Né le **12 juillet 1951**",
          "cm-date": "Fait à Strasbourg, le **15 juin 2026**",
          "cm-gir": "correspond à une évaluation clinique de niveau **GIR 2**"
        }
      }
    },
    
    // Conformity Check state
    conformity: {
      isCniMatching: false,
      isCniValid: false,
      isCmValid: true,
      isConforming: false
    },
    
    // Active document selection in Step 2 (OCR fields)
    activeOcrDoc: "cerfa"
  };

  // Keep track of original values for reset functions
  const originalState = JSON.parse(JSON.stringify(state));

  // Raw OCR Markdown template to display in modal
  let rawMarkdownContent = "";

  // Fetch markdown content from dossier_apa_extrait.md or fallback
  fetch('dossier_apa_extrait.md')
    .then(response => response.text())
    .then(text => {
      rawMarkdownContent = text;
    })
    .catch(err => {
      rawMarkdownContent = "Source indisponible. Chargement du contenu de simulation...";
    });

  // ==========================================
  // 2. DOM ELEMENTS
  // ==========================================
  
  const els = {
    // Tabs Navigation
    tabBtns: document.querySelectorAll(".tab-btn"),
    tabPanes: document.querySelectorAll(".tab-pane"),
    
    // Step 0: Lots & dossier loading
    lotsGrid: document.getElementById("lots-grid"),
    dossiersList: document.getElementById("dossiers-list"),
    selectedLotName: document.getElementById("selected-lot-name"),
    loadingHint: document.getElementById("loading-hint"),

    // Panels & Headers
    pagesContainer: document.getElementById("document-pages-container"),
    viewerPageCount: document.getElementById("viewer-page-count"),
    currentLotId: document.getElementById("current-lot-id"),
    currentDossierId: document.getElementById("current-dossier-id"),
    ocrDocSelect: document.getElementById("ocr-doc-select"),
    ocrFieldsContainer: document.getElementById("ocr-fields-container"),
    ocrZoomBox: document.getElementById("ocr-zoom-box"),
    activeFieldScore: document.getElementById("active-field-score"),
    
    // Recevability & Conformity
    checkIdentity: document.getElementById("check-identity"),
    checkIdentityDesc: document.getElementById("check-identity-desc"),
    checkCniExpiry: document.getElementById("check-cni-expiry"),
    checkCniExpiryDesc: document.getElementById("check-cni-expiry-desc"),
    recevabilityBox: document.getElementById("recevability-box"),
    recevabilityTitle: document.getElementById("recevability-title"),
    recevabilityReasons: document.getElementById("recevability-reasons"),
    btnSimulateConformingCni: document.getElementById("btn-simulate-conforming-cni"),
    btnResetConformity: document.getElementById("btn-reset-conformity"),
    btnGotoDecision: document.getElementById("btn-goto-decision"),
    
    // Decision Support
    decBirthDate: document.getElementById("dec-birth-date"),
    decComputedAge: document.getElementById("dec-computed-age"),
    ruleAgeStatus: document.getElementById("rule-age-status"),
    ruleAgeBadge: document.getElementById("rule-age-badge"),
    decGirSelect: document.getElementById("dec-gir-select"),
    ruleGirStatus: document.getElementById("rule-gir-status"),
    verdictContainer: document.getElementById("verdict-container"),
    verdictTitle: document.getElementById("verdict-title"),
    verdictDesc: document.getElementById("verdict-desc"),
    
    // Global Header & General Actions
    globalOcrScore: document.getElementById("global-ocr-score"),
    globalRecevabilityStatus: document.getElementById("global-recevability-status"),
    btnDownloadPdf: document.getElementById("btn-download-pdf"),
    btnRawMdView: document.getElementById("btn-raw-md-view"),
    
    // Modal
    modal: document.getElementById("md-viewer-modal"),
    modalCodeBlock: document.getElementById("markdown-code-block"),
    btnCloseModal: document.getElementById("btn-close-modal"),
    
    // Steps Flow Buttons
    btnGotoOcr: document.getElementById("btn-goto-ocr"),
    btnValidateOcr: document.getElementById("btn-validate-ocr"),
    btnResetSplits: document.getElementById("btn-reset-splits"),
    btnRestartWorkflow: document.getElementById("btn-restart-workflow"),
    btnFinalizeDossier: document.getElementById("btn-finalize-dossier")
  };

  // ==========================================
  // 3. STEP 0: LOTS & CHARGEMENT DU DOSSIER
  // ==========================================

  // Les étapes de traitement restent verrouillées tant qu'aucun dossier n'est chargé
  const WORKFLOW_TABS = ["tab-decourpage", "tab-ocr", "tab-conformite", "tab-decision"];

  function getSelectedLot() {
    return state.lots.find(l => l.id === state.selectedLotId) || state.lots[0];
  }

  function renderLots() {
    els.lotsGrid.innerHTML = "";

    state.lots.forEach(lot => {
      const isSelected = (lot.id === state.selectedLotId);
      const isEmpty = (lot.dossiers.length === 0);
      const loadedFromThisLot = state.loadedDossier && state.loadedDossier.lotId === lot.id;

      const card = document.createElement("button");
      card.type = "button";
      card.className = `lot-card ${isSelected ? 'selected' : ''} ${isEmpty ? 'is-empty' : ''}`;
      card.id = `lot-card-${lot.id}`;

      let badgeHtml = `<span class="badge badge-muted">Vide</span>`;
      if (loadedFromThisLot) {
        badgeHtml = `<span class="badge badge-success">En cours</span>`;
      } else if (!isEmpty) {
        badgeHtml = `<span class="badge badge-warning">À traiter</span>`;
      }

      const countLabel = isEmpty
        ? `<i class="fa-solid fa-inbox"></i> Aucun dossier en attente`
        : `<i class="fa-solid fa-folder"></i> ${lot.dossiers.length} dossier${lot.dossiers.length > 1 ? 's' : ''} en attente`;

      card.innerHTML = `
        <div class="lot-card-top">
          <span class="lot-card-name"><i class="fa-solid fa-boxes-stacked"></i> ${lot.name}</span>
          ${badgeHtml}
        </div>
        <div class="lot-card-meta">
          Numérisé le ${lot.date}<br>${lot.source}
        </div>
        <div class="lot-card-count">${countLabel}</div>
      `;

      card.addEventListener("click", () => {
        state.selectedLotId = lot.id;
        renderLots();
        renderDossiersList();
      });

      els.lotsGrid.appendChild(card);
    });
  }

  function renderDossiersList() {
    const lot = getSelectedLot();
    els.selectedLotName.textContent = lot.name;
    els.dossiersList.innerHTML = "";

    if (lot.dossiers.length === 0) {
      els.dossiersList.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-inbox"></i>
          <div class="empty-state-title">Ce lot ne contient aucun dossier</div>
          <div class="empty-state-desc">Le ${lot.name} a été entièrement traité ou n'a pas encore reçu de numérisation. Sélectionnez un autre lot pour poursuivre.</div>
        </div>
      `;
      els.loadingHint.innerHTML = `<i class="fa-solid fa-circle-info"></i> Sélectionnez un lot contenant des dossiers pour continuer.`;
      return;
    }

    lot.dossiers.forEach(dossier => {
      const isLocked = (dossier.status === "locked");
      const isLoaded = state.loadedDossier && state.loadedDossier.dossierId === dossier.id;

      const row = document.createElement("div");
      row.className = `dossier-row ${isLocked ? 'is-locked' : 'is-available'}`;
      row.id = `dossier-row-${dossier.id}`;

      let actionHtml;
      if (isLocked) {
        actionHtml = `<span class="dossier-locked-note"><i class="fa-solid fa-lock"></i> ${dossier.lockedNote}</span>`;
      } else if (isLoaded) {
        actionHtml = `
          <span class="doc-card-status text-success"><i class="fa-solid fa-circle-check"></i> Chargé</span>
          <button class="btn btn-outline" data-load="${dossier.id}">
            <i class="fa-solid fa-rotate-right"></i> Reprendre
          </button>
        `;
      } else {
        actionHtml = `
          <button class="btn btn-primary" data-load="${dossier.id}">
            <i class="fa-solid fa-folder-open"></i> Charger ce dossier
          </button>
        `;
      }

      row.innerHTML = `
        <div class="dossier-icon"><i class="fa-solid ${isLocked ? 'fa-lock' : 'fa-file-pdf'}"></i></div>
        <div class="dossier-info">
          <div class="dossier-title">${dossier.name}</div>
          <div class="dossier-sub">${dossier.usager} • ${dossier.pages} pages • PDF ${dossier.size}</div>
        </div>
        ${actionHtml}
      `;

      const loadBtn = row.querySelector("[data-load]");
      if (loadBtn) {
        loadBtn.addEventListener("click", () => loadDossier(lot, dossier));
      }

      els.dossiersList.appendChild(row);
    });

    els.loadingHint.innerHTML = `<i class="fa-solid fa-circle-info"></i> Chargez un dossier pour activer les étapes de découpage, d'extraction et de contrôle.`;
  }

  function loadDossier(lot, dossier) {
    state.loadedDossier = {
      lotId: lot.id,
      lotName: lot.name,
      dossierId: dossier.id,
      dossierName: dossier.name,
      pages: dossier.pages
    };

    updateWorkflowAccess();
    renderLots();
    renderDossiersList();
    updateSplitsDisplay();
    renderFieldsForm();
    recalculateGlobalState();

    // Enchaînement direct sur l'étape de découpage déjà existante
    switchTab("tab-decourpage");
  }

  function unloadDossier() {
    state.loadedDossier = null;
    updateWorkflowAccess();
    renderLots();
    renderDossiersList();
    renderDocumentViewer();
    switchTab("tab-chargement");
  }

  function updateWorkflowAccess() {
    const loaded = state.loadedDossier;

    // Verrouillage / déverrouillage des onglets de traitement
    els.tabBtns.forEach(btn => {
      const tabId = btn.getAttribute("data-tab");
      if (WORKFLOW_TABS.includes(tabId)) {
        btn.disabled = !loaded;
        btn.title = loaded ? "" : "Chargez d'abord un dossier (étape 1)";
      }
    });

    // Bandeau d'informations en haut de l'application
    if (loaded) {
      els.currentLotId.textContent = loaded.lotName;
      els.currentDossierId.textContent = loaded.dossierName;
      els.viewerPageCount.textContent = `${loaded.pages} Pages`;
    } else {
      els.currentLotId.textContent = "—";
      els.currentDossierId.textContent = "Aucun";
      els.viewerPageCount.textContent = "—";
      els.globalOcrScore.className = "meta-value";
      els.globalOcrScore.textContent = "—";
      els.globalRecevabilityStatus.className = "meta-value";
      els.globalRecevabilityStatus.innerHTML = '<i class="fa-solid fa-hourglass-half"></i> En attente';
    }
  }

  // ==========================================
  // 4. PAGE INITIALIZATION & DECOUPAGE
  // ==========================================

  function renderDocumentViewer() {
    els.pagesContainer.innerHTML = "";

    // Aucun dossier chargé : le volet de visualisation reste vide
    if (!state.loadedDossier) {
      els.pagesContainer.innerHTML = `
        <div class="viewer-empty-state">
          <i class="fa-solid fa-folder-open"></i>
          <div class="empty-state-title">Aucun dossier chargé</div>
          <div class="empty-state-desc">Sélectionnez un lot puis chargez un dossier depuis l'étape 1 « Chargement ».</div>
        </div>
      `;
      return;
    }

    const pageTypes = [
      { num: 1, type: "CERFA - Demande APA (Page 1/4)", title: "CERFA APA", lines: 8 },
      { num: 2, type: "CERFA - Coordonnées (Page 2/4)", title: "COORDONNÉES", lines: 6 },
      { num: 3, type: "CERFA - Ressources (Page 3/4)", title: "RESOURCES", lines: 5 },
      { num: 4, type: "CERFA - Signature (Page 4/4)", title: "SIGNATURE", lines: 4 },
      { num: 5, type: "PIÈCE JUSTIFICATIVE D'IDENTITÉ", title: "CNI (IDENTITÉ)", lines: 0, isCni: true },
      { num: 6, type: "PIÈCE JUSTIFICATIVE MÉDICALE", title: "CERTIFICAT MÉDICAL", lines: 0, isCm: true }
    ];

    pageTypes.forEach((p, idx) => {
      // Create thumbnail container
      const container = document.createElement("div");
      container.className = "page-thumbnail-container";
      
      // Determine document grouping background based on active splits
      // We will assign a subtle border/group color
      let groupClass = "group-cerfa";
      if (idx === 4) groupClass = "group-cni";
      if (idx === 5) groupClass = "group-cm";
      
      // Build thumbnail page
      const pageEl = document.createElement("div");
      pageEl.className = `page-thumbnail ${groupClass}`;
      pageEl.id = `page-thumb-${p.num}`;
      
      // Mini page content
      let pageContent = "";
      if (p.isCni) {
        const cniNom = state.ocrData.cni.fields.find(f => f.id === "cni-nom").value;
        const cniPrenom = state.ocrData.cni.fields.find(f => f.id === "cni-prenom").value;
        const cniExp = state.ocrData.cni.fields.find(f => f.id === "cni-expiration").value;
        const isConforming = (cniNom === "DUPONT");
        
        pageContent = `
          <div class="mini-header"><span>CNI</span><span>RF</span></div>
          <div class="mini-title">CARTE D'IDENTITÉ</div>
          <div class="mini-cni-card">
            <div class="mini-cni-photo">Photo</div>
            <div class="mini-cni-details">
              <strong>NOM : ${cniNom}</strong><br>
              PRÉNOM : ${cniPrenom.split(' ')[0]}<br>
              NÉ LE : 13/07/1990<br>
              <span style="color: ${isConforming ? 'green' : 'red'}; font-weight: bold;">EXP : ${cniExp}</span>
            </div>
          </div>
        `;
      } else if (p.isCm) {
        pageContent = `
          <div class="mini-header"><span>MÉDECINE</span><span>STBG</span></div>
          <div class="mini-title">CERTIFICAT MÉDICAL</div>
          <div class="mini-line bold"></div>
          <div class="mini-line medium"></div>
          <p style="font-size: 4px; margin-top: 10px;">Patient : <strong>Jean DUPONT</strong></p>
          <p style="font-size: 4px; margin-top: 2px;">Grille AGGIR : <strong>GIR 2</strong></p>
          <div style="margin-top: 20px; text-align: right; font-size: 3px; font-weight: bold;">Dr. Martin</div>
        `;
      } else {
        // Cerfa mini rows
        let rowsHtml = "";
        for (let i = 0; i < p.lines; i++) {
          rowsHtml += `<div class="mini-line ${i % 3 === 0 ? 'short' : i % 2 === 0 ? 'medium' : ''}"></div>`;
        }
        
        // Highlight Nom in page 1
        if (p.num === 1) {
          const cerfaNom = state.ocrData.cerfa.fields.find(f => f.id === "cerfa-nom").value;
          rowsHtml = `
            <div class="mini-line"></div>
            <p style="font-size: 4px; font-weight: bold; margin-top: 8px;">1. IDENTITÉ DU DEMANDEUR</p>
            <p style="font-size: 4px; margin-top: 5px; color: ${cerfaNom === 'DUPONT' ? 'green' : '#f59e0b'}; font-weight: bold;">NOM : ${cerfaNom}</p>
            <div class="mini-line medium"></div>
            <div class="mini-line"></div>
            <div class="mini-line short"></div>
          `;
        }
        
        pageContent = `
          <div class="mini-header"><span>CERFA</span><span>Bas-Rhin</span></div>
          <div class="mini-title">${p.title}</div>
          ${rowsHtml}
          <div style="position: absolute; bottom: 5px; right: 10px; font-size: 3px; color: #aaa;">Page ${p.num}/6</div>
        `;
      }
      
      pageEl.innerHTML = pageContent;
      
      // Page tag labels overlay
      const pageNumTag = document.createElement("span");
      pageNumTag.className = "page-number-tag";
      pageNumTag.textContent = `Page ${p.num}`;
      
      const pageTypeTag = document.createElement("span");
      pageTypeTag.className = "page-type-tag";
      pageTypeTag.textContent = getPageTypeLabel(p.num);
      
      container.appendChild(pageEl);
      container.appendChild(pageNumTag);
      container.appendChild(pageTypeTag);
      
      // Attach click to inspect fields
      pageEl.addEventListener("click", () => {
        // Set focus to the active document in tab 2
        let docName = "cerfa";
        if (p.num === 5) docName = "cni";
        if (p.num === 6) docName = "cm";
        
        state.activeOcrDoc = docName;
        els.ocrDocSelect.value = docName;
        renderFieldsForm();
        switchTab("tab-ocr");
        
        // Highlight active page
        document.querySelectorAll(".page-thumbnail").forEach(t => t.classList.remove("active"));
        pageEl.classList.add("active");
      });
      
      els.pagesContainer.appendChild(container);
      
      // Render scissor split line between thumbnails (if not the last page)
      if (idx < 5) {
        const cutContainer = document.createElement("div");
        const isSplit = state.splits[idx];
        cutContainer.className = `cut-line-container ${isSplit ? 'is-split' : ''}`;
        cutContainer.id = `cut-line-${idx}`;
        
        cutContainer.innerHTML = `
          <div class="cut-line"></div>
          <button class="cut-btn" title="${isSplit ? 'Fusionner les documents' : 'Découper le document ici'}">
            <i class="fa-${isSplit ? 'solid fa-link' : 'solid fa-scissors'}"></i>
          </button>
        `;
        
        // Interaction for splitting/merging
        cutContainer.querySelector(".cut-btn").addEventListener("click", (e) => {
          e.stopPropagation();
          state.splits[idx] = !state.splits[idx];
          updateSplitsDisplay();
          recalculateGlobalState();
        });
        
        els.pagesContainer.appendChild(cutContainer);
      }
    });
  }
  
  function getPageTypeLabel(pageNum) {
    // Look up what document type this page belongs to based on splits state
    // Splits index 0-4 corresponds to spaces between 1-2, 2-3, 3-4, 4-5, 5-6
    if (pageNum <= 4) {
      // By default pages 1-4 are CERFA, check if there's an active split among them
      let isSubDivided = false;
      for (let i = 0; i < pageNum - 1; i++) {
        if (state.splits[i]) isSubDivided = true;
      }
      return isSubDivided ? "CERFA (Scindé)" : "CERFA APA";
    } else if (pageNum === 5) {
      return "PJ CNI";
    } else {
      return "PJ Cert. Médical";
    }
  }
  
  function updateSplitsDisplay() {
    // Redraw pages container to apply new classes & tags
    renderDocumentViewer();
    
    // Update Right panel list
    // Doc 1: CERFA
    let cerfaPages = "Pages 1 à 4";
    let isCerfaSplit = false;
    for (let i = 0; i < 3; i++) {
      if (state.splits[i]) isCerfaSplit = true;
    }
    
    // Find boundaries dynamically
    const docs = getDocumentBoundaries();
    
    const docCardCerfa = document.getElementById("doc-card-cerfa");
    const docCardCni = document.getElementById("doc-card-cni");
    const docCardCm = document.getElementById("doc-card-cm");
    
    // Clear dynamic split cards if any
    const decSummary = document.querySelector(".dec-summary");
    decSummary.innerHTML = "";
    
    docs.forEach((doc, idx) => {
      const card = document.createElement("div");
      card.className = "doc-card";
      
      let iconClass = "cerfa";
      let icon = "fa-file-signature";
      let docName = `Pièce #${idx+1} : `;
      
      if (doc.type === "cerfa") {
        iconClass = "cerfa";
        icon = "fa-file-signature";
        docName += "Demande APA (CERFA)";
      } else if (doc.type === "cni") {
        iconClass = "cni";
        icon = "fa-id-card";
        docName += "Justificatif d'Identité (CNI)";
      } else if (doc.type === "cm") {
        iconClass = "cm";
        icon = "fa-file-medical";
        docName += "Certificat Médical";
      } else {
        iconClass = "outline";
        icon = "fa-file-circle-question";
        docName += "Document inconnu";
      }
      
      card.innerHTML = `
        <div class="doc-card-icon ${iconClass}"><i class="fa-solid ${icon}"></i></div>
        <div class="doc-card-info">
          <div class="doc-card-title">${docName}</div>
          <div class="doc-card-pages">Pages ${doc.start} à ${doc.end}</div>
        </div>
        <div class="doc-card-status text-success">
          <i class="fa-solid fa-circle-check"></i> ${doc.isAuto ? 'Auto-détecté' : 'Manuel'}
        </div>
      `;
      
      decSummary.appendChild(card);
    });
  }
  
  function getDocumentBoundaries() {
    const docs = [];
    let currentStart = 1;
    
    for (let i = 0; i < 5; i++) {
      if (state.splits[i]) {
        // Split occurs at index i (between page i+1 and i+2)
        const endPage = i + 1;
        docs.push(createDocInfo(currentStart, endPage));
        currentStart = i + 2;
      }
    }
    docs.push(createDocInfo(currentStart, 6));
    return docs;
  }
  
  function createDocInfo(start, end) {
    // Guess type of document based on pages
    let type = "unknown";
    let isAuto = true;
    
    // Check if default splits are matches
    if (start === 1 && end === 4) {
      type = "cerfa";
    } else if (start === 5 && end === 5) {
      type = "cni";
    } else if (start === 6 && end === 6) {
      type = "cm";
    } else {
      isAuto = false;
      // Heuristic for split components
      if (start <= 4) type = "cerfa";
      else if (start === 5) type = "cni";
      else if (start === 6) type = "cm";
    }
    
    return { start, end, type, isAuto };
  }

  // ==========================================
  // 5. STEP 2: STRUCTURATION & PRE-CONTROLE
  // ==========================================
  
  function renderFieldsForm() {
    const docType = state.activeOcrDoc;
    const docData = state.ocrData[docType];
    
    els.ocrFieldsContainer.innerHTML = "";
    
    docData.fields.forEach(field => {
      const fieldGroup = document.createElement("div");
      fieldGroup.className = `field-group ${field.status === 'warning' ? 'has-warning' : ''}`;
      fieldGroup.id = `field-grp-${field.id}`;
      
      let confidenceClass = "high";
      if (field.score < 70) confidenceClass = "low";
      else if (field.score < 90) confidenceClass = "medium";
      
      fieldGroup.innerHTML = `
        <div class="field-header-info">
          <label for="input-${field.id}" class="field-lbl">${field.label}</label>
          <span class="field-confidence ${confidenceClass}">
            <i class="fa-solid fa-signal"></i> Confiance : ${field.score}%
          </span>
        </div>
        <div class="field-input-wrapper">
          <input type="text" id="input-${field.id}" class="form-input-text" value="${field.value}">
          <i class="fa-solid fa-circle-check field-success-icon" style="${field.status === 'ok' ? 'display: block;' : ''}"></i>
        </div>
        ${field.status === 'warning' ? `<div class="field-warning-msg" id="warning-msg-${field.id}"><i class="fa-solid fa-triangle-exclamation"></i> ${field.errorMsg}</div>` : ''}
      `;
      
      // Hook input interactions
      const inputEl = fieldGroup.querySelector("input");
      inputEl.addEventListener("focus", () => {
        // Update Live OCR snippet box
        els.ocrZoomBox.innerHTML = `<p>${docData.zoomSnippets[field.id] || ''}</p>`;
        els.activeFieldScore.textContent = `${field.score}%`;
        
        // Remove active class from previous
        els.activeFieldScore.className = `field-score-badge ${confidenceClass}`;
      });
      
      // Update data on keyup/change
      inputEl.addEventListener("input", (e) => {
        const newVal = e.target.value;
        field.value = newVal;
        
        // Live correction rules
        if (field.id === "cerfa-nom") {
          // If user corrects D_PO_T to DUPONT
          if (newVal.toUpperCase() === "DUPONT") {
            field.score = 99;
            field.status = "ok";
            fieldGroup.classList.remove("has-warning");
            const wMsg = fieldGroup.querySelector(".field-warning-msg");
            if (wMsg) wMsg.remove();
            fieldGroup.querySelector(".field-success-icon").style.display = "block";
            
            // Recalculate OCR scores
            recalculateGlobalState();
          } else {
            // Keep warning
            field.score = 65;
            field.status = "warning";
          }
        }
        
        // Update live zoom snippet highlighting
        updateZoomSnippet(docType, field.id, newVal);
        
        // Propagate changes to dynamic decision rules in step 4
        if (field.id === "cerfa-naissance") {
          const formattedDate = parseDateFrench(newVal);
          if (formattedDate) {
            els.decBirthDate.value = formattedDate;
            calculateAgeAndRules();
          }
        }
      });
      
      els.ocrFieldsContainer.appendChild(fieldGroup);
    });
  }
  
  function updateZoomSnippet(docType, fieldId, value) {
    const rawSnippet = state.ocrData[docType].zoomSnippets[fieldId];
    if (!rawSnippet) return;
    
    // Replace text in zoom snippet
    let labelPart = rawSnippet.split(" : ")[0] || "";
    if (labelPart) {
      els.ocrZoomBox.innerHTML = `<p>${labelPart} : **<strong>${value}</strong>**</p>`;
    }
  }
  
  function parseDateFrench(dateStr) {
    // 12/07/1951 -> 1951-07-12
    const parts = dateStr.split("/");
    if (parts.length === 3) {
      const day = parts[0].trim().padStart(2, '0');
      const month = parts[1].trim().padStart(2, '0');
      const year = parts[2].trim();
      if (year.length === 4) {
        return `${year}-${month}-${day}`;
      }
    }
    return null;
  }

  // ==========================================
  // 6. PHASE 2: CONFORMITE & RECEVABILITE
  // ==========================================
  
  function checkConformityAndRecevability() {
    const cerfaNomField = state.ocrData.cerfa.fields.find(f => f.id === "cerfa-nom");
    const cerfaPrenomField = state.ocrData.cerfa.fields.find(f => f.id === "cerfa-prenom");
    
    const cniNomField = state.ocrData.cni.fields.find(f => f.id === "cni-nom");
    const cniPrenomField = state.ocrData.cni.fields.find(f => f.id === "cni-prenom");
    const cniExpField = state.ocrData.cni.fields.find(f => f.id === "cni-expiration");
    
    const cerfaNom = cerfaNomField.value.toUpperCase();
    const cniNom = cniNomField.value.toUpperCase();
    
    // Identity Check
    const isNomMatching = (cerfaNom === cniNom);
    state.conformity.isCniMatching = isNomMatching;
    
    if (isNomMatching) {
      els.checkIdentity.className = "check-item check-passed";
      els.checkIdentity.querySelector(".check-status-icon").innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      els.checkIdentityDesc.textContent = `Demandeur : ${cerfaNom} ${cerfaPrenomField.value} | CNI : ${cniNomField.value} ${cniPrenomField.value}`;
    } else {
      els.checkIdentity.className = "check-item check-failed";
      els.checkIdentity.querySelector(".check-status-icon").innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
      els.checkIdentityDesc.textContent = `Demandeur : ${cerfaNom} ${cerfaPrenomField.value} | CNI : ${cniNomField.value} ${cniPrenomField.value}`;
    }
    
    // Expiry Check
    // Convert expiration to date. Expiration is 15/09/2024. Current date is 02/07/2026.
    const expParts = cniExpField.value.split("/");
    let isCniValid = false;
    if (expParts.length === 3) {
      const expDate = new Date(expParts[2], expParts[1] - 1, expParts[0]);
      const currentDate = new Date(2026, 6, 2); // 02/07/2026
      isCniValid = (expDate > currentDate);
    }
    state.conformity.isCniValid = isCniValid;
    
    if (isCniValid) {
      els.checkCniExpiry.className = "check-item check-passed";
      els.checkCniExpiry.querySelector(".check-status-icon").innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      els.checkCniExpiryDesc.textContent = `La CNI expire le ${cniExpField.value} (Date courante : 02/07/2026) - En cours de validité`;
    } else {
      els.checkCniExpiry.className = "check-item check-failed";
      els.checkCniExpiry.querySelector(".check-status-icon").innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
      els.checkCniExpiryDesc.textContent = `La CNI a expiré le ${cniExpField.value} (Date courante : 02/07/2026) - Pièce périmée`;
    }
    
    // Recevability Calculation
    // Total documents is recevable if all conformity checks pass AND we have exactly 3 parts in splits (representing CERFA, CNI, CM)
    const boundaries = getDocumentBoundaries();
    const hasCerfa = boundaries.some(b => b.type === "cerfa");
    const hasCni = boundaries.some(b => b.type === "cni");
    const hasCm = boundaries.some(b => b.type === "cm");
    const docSplitsCorrect = (hasCerfa && hasCni && hasCm);
    
    const isRecevable = (isNomMatching && isCniValid && state.conformity.isCmValid && docSplitsCorrect);
    state.conformity.isConforming = isRecevable;
    
    if (isRecevable) {
      els.recevabilityBox.className = "recevability-card card-passed";
      els.recevabilityTitle.innerHTML = '<i class="fa-solid fa-circle-check"></i> DOSSIER RECEVABLE';
      els.recevabilityReasons.innerHTML = `
        <li>Les 3 pièces obligatoires sont présentes et conformes (CERFA, CNI, Certificat Médical).</li>
        <li>Aucune anomalie d'identité ou de validité détectée.</li>
      `;
      
      // Update global header badge
      els.globalRecevabilityStatus.className = "meta-value text-success";
      els.globalRecevabilityStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Recevable';
      
      // Enable next step button
      els.btnGotoDecision.removeAttribute("disabled");
    } else {
      els.recevabilityBox.className = "recevability-card card-failed";
      els.recevabilityTitle.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> DOSSIER NON RECEVABLE';
      
      let reasonsHtml = "";
      if (!docSplitsCorrect) {
        reasonsHtml += `<li>Découpage incorrect : les pièces obligatoires ne sont pas correctement séparées.</li>`;
      }
      if (!isNomMatching) {
        reasonsHtml += `<li>Incohérence d'identité : le nom sur la pièce d'identité (${cniNom}) diffère de la demande CERFA (${cerfaNom}).</li>`;
      }
      if (!isCniValid) {
        reasonsHtml += `<li>La pièce d'identité fournie a expiré (le ${cniExpField.value}).</li>`;
      }
      els.recevabilityReasons.innerHTML = reasonsHtml;
      
      // Update global header badge
      els.globalRecevabilityStatus.className = "meta-value text-danger";
      els.globalRecevabilityStatus.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Non Recevable';
      
      // Disable next step button
      els.btnGotoDecision.setAttribute("disabled", "true");
    }
  }

  // ==========================================
  // 7. PHASE 3: AIDE A LA DECISION (REGLES METIER)
  // ==========================================
  
  function calculateAgeAndRules() {
    const birthDateVal = els.decBirthDate.value; // yyyy-mm-dd
    if (!birthDateVal) return;
    
    const birthDate = new Date(birthDateVal);
    const currentDate = new Date(2026, 6, 2); // 02/07/2026
    
    let age = currentDate.getFullYear() - birthDate.getFullYear();
    const m = currentDate.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && currentDate.getDate() < birthDate.getDate())) {
      age--;
    }
    
    els.decComputedAge.textContent = `${age} ans`;
    
    // Check Age Rule: legal age for APA is 60+
    const isAgeEligible = (age >= 60);
    if (isAgeEligible) {
      els.ruleAgeStatus.className = "calc-value text-success";
      els.ruleAgeStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> Éligible (>= 60 ans)';
      els.ruleAgeBadge.className = "badge badge-success";
      els.ruleAgeBadge.textContent = "Éligible";
    } else {
      els.ruleAgeStatus.className = "calc-value text-danger";
      els.ruleAgeStatus.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Inéligible (< 60 ans)`;
      els.ruleAgeBadge.className = "badge badge-danger";
      els.ruleAgeBadge.textContent = "Rejet";
    }
    
    // Check GIR Rule: GIR 1 to 4 are eligible, GIR 5 and 6 are independent
    const girVal = parseInt(els.decGirSelect.value);
    const isGirEligible = (girVal >= 1 && girVal <= 4);
    if (isGirEligible) {
      els.ruleGirStatus.className = "calc-value text-success";
      els.ruleGirStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Éligible (GIR ${girVal})`;
    } else {
      els.ruleGirStatus.className = "calc-value text-danger";
      els.ruleGirStatus.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Inéligible (GIR ${girVal})`;
    }
    
    // Final Verdict Advice
    const nameVal = state.ocrData.cerfa.fields.find(f => f.id === "cerfa-nom").value;
    const prenomVal = state.ocrData.cerfa.fields.find(f => f.id === "cerfa-prenom").value;
    const patientName = `${prenomVal} ${nameVal}`;
    
    if (isAgeEligible && isGirEligible) {
      els.verdictContainer.className = "verdict-box";
      els.verdictContainer.querySelector(".verdict-icon").innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      els.verdictTitle.textContent = "DÉCISION CONSEILLÉE : APPROUVER & CONTINUER L'INSTRUCTION";
      els.verdictDesc.textContent = `L'usager ${patientName} est âgé de ${age} ans et est classé en GIR ${girVal}. Son dossier remplit tous les critères légaux pour l'attribution de l'APA. Poursuivre vers l'instruction de l'aide et le plan d'accompagnement.`;
      els.btnFinalizeDossier.removeAttribute("disabled");
    } else if (!isAgeEligible) {
      // Under 60: routing to CAF / specialized services
      els.verdictContainer.className = "verdict-box verdict-failed";
      els.verdictContainer.querySelector(".verdict-icon").innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
      els.verdictTitle.textContent = "RECOMMANDATION : ENVOI DU DOSSIER À LA CAF";
      els.verdictDesc.textContent = `L'usager ${patientName} a ${age} ans. N'ayant pas atteint l'âge légal de 60 ans pour l'APA départementale, la demande doit être transmise à la CAF pour l'instruction d'autres aides d'autonomie.`;
      els.btnFinalizeDossier.removeAttribute("disabled"); // Let user click to route the dossier
    } else {
      // GIR 5 or 6: Independent
      els.verdictContainer.className = "verdict-box verdict-failed";
      els.verdictContainer.querySelector(".verdict-icon").innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
      els.verdictTitle.textContent = "DÉCISION CONSEILLÉE : REFUS (USAGER AUTONOME)";
      els.verdictDesc.textContent = `L'usager ${patientName} est classé en GIR ${girVal}. Le degré de perte d'autonomie étant insuffisant (l'APA est réservée aux GIR 1 à 4), le dossier doit être notifié d'un refus administratif pour autonomie conservée.`;
      els.btnFinalizeDossier.removeAttribute("disabled");
    }
  }

  // ==========================================
  // 8. GLOBAL HEURISTICS & RECALCULATIONS
  // ==========================================
  
  function recalculateGlobalState() {
    // Tant qu'aucun dossier n'est chargé, le bandeau reste en attente
    if (!state.loadedDossier) {
      updateWorkflowAccess();
      return;
    }

    // 1. Calculate general OCR confidence score
    let totalScore = 0;
    let fieldCount = 0;
    
    Object.keys(state.ocrData).forEach(docKey => {
      state.ocrData[docKey].fields.forEach(field => {
        totalScore += field.score;
        fieldCount++;
      });
    });
    
    const avgOcrScore = Math.round(totalScore / fieldCount);
    els.globalOcrScore.textContent = `${avgOcrScore}%`;
    
    if (avgOcrScore < 75) els.globalOcrScore.className = "meta-value text-danger";
    else if (avgOcrScore < 95) els.globalOcrScore.className = "meta-value text-warning";
    else els.globalOcrScore.className = "meta-value text-success";
    
    // 2. Perform conformity check
    checkConformityAndRecevability();
    
    // 3. Update Decision criteria
    calculateAgeAndRules();
  }

  // ==========================================
  // 9. SIMULATION ACTIONS & EVENTS
  // ==========================================
  
  // Tab Switching
  function switchTab(tabId) {
    // Les étapes de traitement sont inaccessibles tant qu'aucun dossier n'est chargé
    if (!state.loadedDossier && WORKFLOW_TABS.includes(tabId)) {
      tabId = "tab-chargement";
    }

    state.activeTab = tabId;

    // Update tabs active state class
    els.tabBtns.forEach(btn => {
      if (btn.getAttribute("data-tab") === tabId) {
        btn.classList.add("active");
      } else {
        btn.classList.remove("active");
      }
    });
    
    // Update panes active state class
    els.tabPanes.forEach(pane => {
      if (pane.id === tabId) {
        pane.classList.add("active");
      } else {
        pane.classList.remove("active");
      }
    });
  }
  
  els.tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      switchTab(btn.getAttribute("data-tab"));
    });
  });
  
  // Dropdown piece selector in step 2
  els.ocrDocSelect.addEventListener("change", (e) => {
    state.activeOcrDoc = e.target.value;
    renderFieldsForm();
    
    // Focus corresponding page in left viewer
    let pageNum = 1;
    if (e.target.value === "cni") pageNum = 5;
    if (e.target.value === "cm") pageNum = 6;
    
    document.querySelectorAll(".page-thumbnail").forEach(t => t.classList.remove("active"));
    const activeThumb = document.getElementById(`page-thumb-${pageNum}`);
    if (activeThumb) {
      activeThumb.classList.add("active");
      activeThumb.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  // Action Flows
  els.btnGotoOcr.addEventListener("click", () => {
    switchTab("tab-ocr");
    renderFieldsForm();
  });

  els.btnValidateOcr.addEventListener("click", () => {
    switchTab("tab-conformite");
    checkConformityAndRecevability();
  });
  
  els.btnGotoDecision.addEventListener("click", () => {
    switchTab("tab-decision");
  });
  
  els.btnResetSplits.addEventListener("click", () => {
    state.splits = [...originalState.splits];
    updateSplitsDisplay();
    recalculateGlobalState();
  });
  
  els.btnRestartWorkflow.addEventListener("click", () => {
    // Deep copy originalState back to state
    Object.assign(state, JSON.parse(JSON.stringify(originalState)));
    els.ocrDocSelect.value = "cerfa";
    els.decBirthDate.value = "1951-07-12";
    els.decGirSelect.value = "2";

    // Réinitialisation du bouton de simulation CNI
    els.btnSimulateConformingCni.className = "btn btn-outline-warning";
    els.btnSimulateConformingCni.innerHTML = '<i class="fa-solid fa-upload"></i> Simuler téléversement CNI Conforme';

    updateSplitsDisplay();
    renderFieldsForm();
    recalculateGlobalState();

    // On repart de la sélection du lot / dossier
    unloadDossier();
  });
  
  els.btnFinalizeDossier.addEventListener("click", () => {
    alert("Succès : Le dossier a été validé par l'agent de pré-contrôle et transmis au logiciel d'instruction métier (Département du Bas-Rhin).");
  });
  
  // Simulation: Upload Conforming CNI
  els.btnSimulateConformingCni.addEventListener("click", () => {
    // Replace CNI fields values with conforming values
    const cniData = state.ocrData.cni;
    cniData.fields.find(f => f.id === "cni-nom").value = "DUPONT";
    cniData.fields.find(f => f.id === "cni-prenom").value = "Jean";
    cniData.fields.find(f => f.id === "cni-naissance").value = "12/07/1951";
    cniData.fields.find(f => f.id === "cni-expiration").value = "10/12/2030";
    
    // Rerender forms if active
    if (state.activeOcrDoc === "cni") {
      renderFieldsForm();
    }
    
    recalculateGlobalState();
    
    // Add visually green highlight to simulated button
    els.btnSimulateConformingCni.className = "btn btn-success";
    els.btnSimulateConformingCni.innerHTML = '<i class="fa-solid fa-circle-check"></i> CNI Conforme Téléversée';
  });
  
  els.btnResetConformity.addEventListener("click", () => {
    // Restore CNI field values
    const cniData = state.ocrData.cni;
    const origCniData = originalState.ocrData.cni;
    
    cniData.fields.forEach((field, idx) => {
      field.value = origCniData.fields[idx].value;
      field.score = origCniData.fields[idx].score;
      field.status = origCniData.fields[idx].status;
    });
    
    if (state.activeOcrDoc === "cni") {
      renderFieldsForm();
    }
    
    els.btnSimulateConformingCni.className = "btn btn-outline-warning";
    els.btnSimulateConformingCni.innerHTML = '<i class="fa-solid fa-upload"></i> Simuler téléversement CNI Conforme';
    
    recalculateGlobalState();
  });
  
  // Decision simulator event changes
  els.decBirthDate.addEventListener("change", (e) => {
    // Extract year from date and update age
    calculateAgeAndRules();
  });
  
  els.decGirSelect.addEventListener("change", () => {
    calculateAgeAndRules();
  });
  
  // Raw MD viewer Modal open/close
  els.btnRawMdView.addEventListener("click", () => {
    els.modalCodeBlock.textContent = rawMarkdownContent || "Chargement du markdown d'exemple...";
    els.modal.classList.add("open");
  });
  
  els.btnCloseModal.addEventListener("click", () => {
    els.modal.classList.remove("open");
  });
  
  window.addEventListener("click", (e) => {
    if (e.target === els.modal) {
      els.modal.classList.remove("open");
    }
  });

  // ==========================================
  // 10. CLIENT-SIDE PDF GENERATOR
  // ==========================================
  
  els.btnDownloadPdf.addEventListener("click", () => {
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      const cerfaNom = state.ocrData.cerfa.fields.find(f => f.id === "cerfa-nom").value;
      const cniNom = state.ocrData.cni.fields.find(f => f.id === "cni-nom").value;
      const cniPrenom = state.ocrData.cni.fields.find(f => f.id === "cni-prenom").value;
      const cniExp = state.ocrData.cni.fields.find(f => f.id === "cni-expiration").value;

      // Page 1: CERFA Demande
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("DEMANDE D'ALLOCATION PERSONNALISÉE D'AUTONOMIE", 20, 30);
      doc.setFontSize(12);
      doc.text("CERFA N° 12101*02", 20, 38);
      
      doc.line(20, 42, 190, 42);
      
      doc.setFontSize(14);
      doc.text("1. SITUATION DU DEMANDEUR", 20, 55);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      
      doc.text("Sexe : Monsieur", 20, 68);
      doc.text(`Nom de naissance : ${cerfaNom}`, 20, 78);
      doc.text("Prénom(s) : Jean", 20, 88);
      doc.text("Date de naissance : 12 / 07 / 1951", 20, 98);
      doc.text("NIR (Sécurité Sociale) : 1 51 07 67 012 345", 20, 108);
      doc.text("Nationalité : Française", 20, 118);
      
      doc.setFontSize(9);
      doc.text("Page 1/6", 180, 285);
      
      // Page 2: CERFA Coordonnées
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("2. COORDONNÉES ET SITUATION FAMILIALE", 20, 30);
      doc.line(20, 35, 190, 35);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("Adresse : 12 Rue de la Paix", 20, 50);
      doc.text("Code postal : 67000", 20, 60);
      doc.text("Ville : Strasbourg", 20, 70);
      doc.text("Téléphone : 03 88 12 34 56", 20, 80);
      doc.text("Courriel : jean.dupont@email.fr", 20, 90);
      
      doc.setFont("helvetica", "bold");
      doc.text("3. SITUATION FAMILIALE", 20, 110);
      doc.setFont("helvetica", "normal");
      doc.text("Situation : Célibataire / Veuf / Divorcé", 20, 120);
      
      doc.setFontSize(9);
      doc.text("Page 2/6", 180, 285);
      
      // Page 3: CERFA Ressources
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("4. DÉCLARATION DE RESSOURCES", 20, 30);
      doc.line(20, 35, 190, 35);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("Pensions de retraite régimes de base : 14 250 euros / an", 20, 50);
      doc.text("Retraites complémentaires : 3 800 euros / an", 20, 60);
      doc.text("Revenus immobiliers : 120 euros / an", 20, 70);
      doc.text("Autres ressources : 0 euro", 20, 80);
      
      doc.setFontSize(9);
      doc.text("Page 3/6", 180, 285);
      
      // Page 4: CERFA Signature
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("5. ENGAGEMENT ET SIGNATURE", 20, 30);
      doc.line(20, 35, 190, 35);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("Je certifie sur l'honneur l'exactitude des informations fournies.", 20, 50);
      doc.text("Fait à Strasbourg, le 20 juin 2026.", 20, 60);
      
      doc.setFont("helvetica", "bold");
      doc.text("Signature du demandeur :", 20, 80);
      doc.setFont("courier", "italic");
      doc.text("Jean Dupont", 25, 92);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Page 4/6", 180, 285);
      
      // Page 5: Justificatif - CNI (Maëlys Martin or Conformed Dupont)
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("PIÈCE JUSTIFICATIVE D'IDENTITÉ", 20, 30);
      doc.line(20, 35, 190, 35);
      
      // Card structure representation
      doc.rect(40, 50, 130, 80);
      doc.setFontSize(11);
      doc.text("RÉPUBLIQUE FRANÇAISE - CARTE NATIONALE D'IDENTITÉ", 45, 60);
      doc.line(40, 65, 170, 65);
      
      doc.rect(45, 75, 25, 30);
      doc.setFontSize(8);
      doc.text("[ PHOTO ]", 50, 90);
      
      doc.setFontSize(10);
      doc.text(`Nom : ${cniNom}`, 80, 78);
      doc.text(`Prénom : ${cniPrenom}`, 80, 88);
      doc.text("Sexe : F", 80, 98);
      doc.text("Né(e) le : 13/07/1990", 80, 108);
      doc.text(`Expiration : ${cniExp}`, 80, 118);
      
      doc.setFontSize(9);
      doc.text("Page 5/6", 180, 285);
      
      // Page 6: Certificat Médical
      doc.addPage();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.text("PIÈCE JUSTIFICATIVE MÉDICALE", 20, 30);
      doc.line(20, 35, 190, 35);
      
      doc.setFontSize(11);
      doc.text("Dr. Jean-Pierre MARTIN - Médecin Généraliste", 20, 50);
      doc.text("3 Boulevard de l'Orangerie, 67000 Strasbourg", 20, 56);
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("CERTIFICAT MÉDICAL", 80, 80);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text("Je soussigné, Dr. Jean-Pierre MARTIN, certifie avoir examiné ce jour :", 20, 100);
      doc.setFont("helvetica", "bold");
      doc.text("Monsieur Jean DUPONT, né le 12/07/1951,", 20, 108);
      doc.setFont("helvetica", "normal");
      doc.text("demeurant au 12 Rue de la Paix, 67000 Strasbourg.", 20, 114);
      
      doc.text("Je constate une perte d'autonomie de niveau GIR 2.", 20, 130);
      doc.text("Fait à Strasbourg, le 15 juin 2026.", 20, 150);
      
      doc.setFont("courier", "italic");
      doc.text("Dr. J-P. Martin", 140, 170);
      
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text("Page 6/6", 180, 285);
      
      // Save PDF
      doc.save("dossier_apa.pdf");
      alert("Succès : Le fichier PDF 'dossier_apa.pdf' a été généré avec succès dans votre navigateur.");
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération du PDF d'exemple.");
    }
  });

  // ==========================================
  // 11. SYSTEM LAUNCH
  // ==========================================
  
  // Initial run — l'application démarre sur l'étape de chargement, sans dossier
  updateWorkflowAccess();
  renderLots();
  renderDossiersList();
  updateSplitsDisplay();
  renderFieldsForm();
  recalculateGlobalState();
  switchTab("tab-chargement");

});
