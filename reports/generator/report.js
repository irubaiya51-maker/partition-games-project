// Final, verified version of report.js

document.addEventListener('DOMContentLoaded', () => {
  const gameSelect = document.getElementById('game-select');
  const generateBtn = document.getElementById('generate-report-btn');
  const inputArea = document.getElementById('game-states-input');
  const reportContainer = document.getElementById('report-container');
  
  const chartWrapper = document.getElementById('chart-wrapper');
  const chartCanvas = document.getElementById('g-number-chart');
  let gNumberChart = null;

  const GAME_STORAGE_KEYS = [
    { select: 'Corner', stateKey: 'cornerGameStatesForReport', modeKey: 'cornerReportMode' },
    { select: 'LCTR', stateKey: 'lctrGameStatesForReport', modeKey: 'lctrReportMode' },
    { select: 'CRIM', stateKey: 'crimGameStatesForReport', modeKey: 'crimReportMode' },
    { select: 'Anticorners', stateKey: 'anticornersGameStatesForReport', modeKey: 'anticornersReportMode' },
    { select: 'ContinuousCorner', stateKey: 'continuousCornerGameStatesForReport', modeKey: 'continuousCornerReportMode' },
    { select: 'CRIT', stateKey: 'critGameStatesForReport', modeKey: 'critReportMode' },
    { select: 'CRIS', stateKey: 'crisGameStatesForReport', modeKey: 'crisReportMode' },
    { select: 'RIT', stateKey: 'ritGameStatesForReport', modeKey: 'ritReportMode' },
    { select: 'SatoWelter', stateKey: 'satoWelterGameStatesForReport', modeKey: 'satoWelterReportMode' },
    { select: 'SICC', stateKey: 'siccGameStatesForReport', modeKey: 'siccReportMode' },
    { select: 'iChessRook', stateKey: 'rookGameStatesForReport', modeKey: 'rookReportMode' },
    { select: 'iChessBishop', stateKey: 'bishopGameStatesForReport', modeKey: 'bishopReportMode' },
    { select: 'iChessQueen', stateKey: 'queenGameStatesForReport', modeKey: 'queenReportMode' },
    { select: 'iChessKing', stateKey: 'kingGameStatesForReport', modeKey: 'kingReportMode' },
    { select: 'iChessKnight', stateKey: 'knightGameStatesForReport', modeKey: 'knightReportMode' },
    { select: 'iChessPawn', stateKey: 'pawnGameStatesForReport', modeKey: 'pawnReportMode' },
    { select: 'iChessGeneral', stateKey: 'generalGameStatesForReport', modeKey: 'generalReportMode' },
  ];

  const ICHESS_PIECE_BY_SELECT = {
    iChessRook: 'rook', iChessBishop: 'bishop', iChessQueen: 'queen',
    iChessKing: 'king', iChessKnight: 'knight', iChessPawn: 'pawn', iChessGeneral: 'general',
  };

  const formatHint = document.getElementById('format-hint');
  function updateFormatHint() {
    const game = gameSelect.value;
    if (ICHESS_PIECE_BY_SELECT[game]) {
      formatHint.textContent = 'Format: row lengths, then "@ col,row" for the piece’s cell — e.g. "6 5 4 3 2 @ 2,1".';
      formatHint.style.display = 'block';
    } else if (game === 'CRIS') {
      formatHint.textContent = 'Format: space-separated "HxW" fragments — e.g. "3x4 2x2".';
      formatHint.style.display = 'block';
    } else {
      formatHint.style.display = 'none';
    }
  }
  gameSelect.addEventListener('change', updateFormatHint);
  updateFormatHint();

  function loadFromStorage() {
    for (const { select, stateKey, modeKey } of GAME_STORAGE_KEYS) {
      const states = localStorage.getItem(stateKey);
      if (!states) continue;
      gameSelect.value = select;
      inputArea.value = states;
      localStorage.removeItem(stateKey);
      const mode = localStorage.getItem(modeKey);
      if (mode === 'misere' || mode === 'normal') {
        document.getElementById('game-mode-select').value = mode;
        localStorage.removeItem(modeKey);
      }
      updateFormatHint();
      return;
    }
  }

  function generateGraphFromDOM() {
    const mode = document.getElementById('game-mode-select').value;
    
    if (gNumberChart) { gNumberChart.destroy(); }

    if (mode !== 'normal') {
      chartWrapper.style.display = 'none';
      return;
    }

    const labels = [];
    const gNumbers = [];

    const cards = reportContainer.querySelectorAll('.report-card');
    
    cards.forEach((card) => {
      const titleEl = card.querySelector('.report-header h3');
      const gLabelEl = Array.from(card.querySelectorAll('.label'))
        .find(el => /grundy/i.test(el.textContent) && !/misere/i.test(el.textContent));

      if (titleEl && gLabelEl && gLabelEl.nextElementSibling) {
        const label = titleEl.textContent.trim();
        const gNumber = Number(gLabelEl.nextElementSibling.textContent);
        if (!Number.isNaN(gNumber)) {
          labels.push(label);
          gNumbers.push(gNumber);
        }
      }
    });

    if (gNumbers.length > 0) {
      chartWrapper.style.display = 'block';
      const white = '#ffffff';
      const gridWhite = 'rgba(255,255,255,0.2)';
      gNumberChart = new Chart(chartCanvas, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'g-number per Game State',
            data: gNumbers,
            borderColor: white,
            backgroundColor: white,
            pointBackgroundColor: white,
            pointBorderColor: white,
            tension: 0.1
          }]
        },
        options: {
          responsive: true,
          plugins: {
            title: { display: true, text: 'G-Number Progression', color: white, font: { size: 16 } },
            legend: { labels: { color: white } }
          },
          scales: {
            y: { beginAtZero: true, ticks: { color: white, stepSize: 1 }, grid: { color: gridWhite } },
            x: { ticks: { color: white }, grid: { color: gridWhite } }
          }
        }
      });
    } else {
      chartWrapper.style.display = 'none';
    }
  }

  function render() {
    const game = gameSelect.value;
    const mode = document.getElementById('game-mode-select').value;
    
    try {
      if (game === 'Corner') {
        window.CornerReport.render(reportContainer, inputArea.value, mode);
      } else if (game === 'LCTR') {
        window.LctrReport.render(reportContainer, inputArea.value, mode);
      } else if (game === 'CRIM') {
        window.CrimReport.render(reportContainer, inputArea.value, mode);
      } else if (game === 'Anticorners') {
        window.AnticornersReport.render(reportContainer, inputArea.value, mode);
      } else if (game === 'ContinuousCorner') {
        window.ContinuousCornerReport.render(reportContainer, inputArea.value, mode);
      } else if (game === 'CRIT') {
        window.CritReport.render(reportContainer, inputArea.value, mode);
      } else if (game === 'CRIS') {
        window.CrisReport.render(reportContainer, inputArea.value, mode);
      } else if (game === 'RIT') {
        window.RitReport.render(reportContainer, inputArea.value, mode);
      } else if (game === 'SatoWelter') {
        window.SatoWelterReport.render(reportContainer, inputArea.value, mode);
      } else if (game === 'SICC') {
        window.SiccReport.render(reportContainer, inputArea.value, mode);
      } else if (ICHESS_PIECE_BY_SELECT[game]) {
        window.IChessReport.render(reportContainer, inputArea.value, mode, ICHESS_PIECE_BY_SELECT[game]);
      }
    } catch (error) {
      console.error("An error occurred in a game-specific render function:", error);
    }
    
    generateGraphFromDOM();
  }

  generateBtn.addEventListener('click', render);
  loadFromStorage();
  if (inputArea.value.trim().length > 0) {
    render();
  }
});