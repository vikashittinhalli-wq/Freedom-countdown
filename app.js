"use strict";

window.FREEDOM_COUNTDOWN_VERSION = "2.1.0";

function switchUpdateMode(mode){
  var paymentMode = document.getElementById("paymentMode");
  var balanceMode = document.getElementById("balanceMode");
  var paymentButton = document.getElementById("paymentModeButton");
  var balanceButton = document.getElementById("balanceModeButton");

  if(!paymentMode || !balanceMode || !paymentButton || !balanceButton) return;

  var showPayments = mode === "payments";
  paymentMode.hidden = !showPayments;
  balanceMode.hidden = showPayments;
  paymentButton.classList.toggle("active", showPayments);
  balanceButton.classList.toggle("active", !showPayments);
}

(function(){
  "use strict";

  const ORIGINAL = {
    consumerDebt: 35985.64,
    car: 35221.00,
    savingsGoal: 5000
  };

  const RATES = {
    cc1: 9.99,
    cc2: 13.99,
    zipPlus: 13.7,
    zipMoney: 0,
    car: 13.0
  };

  const DEFAULTS = {
    fund: 0,
    cc1: 9209.08,
    cc2: 18803,
    zipPlus: 3846,
    zipMoney: 2509,
    car: 27617.56,
    updatedAt: null,
    history: [],
    latestReport: null
  };

  const money0 = value => new Intl.NumberFormat("en-AU",{
    style:"currency",currency:"AUD",maximumFractionDigits:0
  }).format(Number(value || 0));

  const money2 = value => new Intl.NumberFormat("en-AU",{
    style:"currency",currency:"AUD",minimumFractionDigits:2,maximumFractionDigits:2
  }).format(Number(value || 0));

  function load(){
    try{
      return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem("freedomCountdownData") || "{}"));
    }catch(e){
      return {...DEFAULTS};
    }
  }

  let data = load();

  function save(){
    localStorage.setItem("freedomCountdownData", JSON.stringify(data));
  }

  function setText(id, value){
    const node = document.getElementById(id);
    if(node) node.textContent = value;
  }

  function setWidth(id, value){
    const node = document.getElementById(id);
    if(node) node.style.width = Math.max(0, Math.min(100, value)) + "%";
  }

  function consumerTotal(state){
    return state.cc1 + state.cc2 + state.zipPlus + state.zipMoney;
  }

  function daysBetween(fromIso, toIso){
    if(!fromIso) return 30;
    const from = new Date(fromIso);
    const to = new Date(toIso);
    const days = Math.round((to - from) / 86400000);
    return Math.max(1, days);
  }

  function estimatedInterest(balance, apr, days){
    return balance * (apr / 100) * (days / 365);
  }

  function render(){
    const consumer = consumerTotal(data);
    const consumerPaid = Math.max(0, ORIGINAL.consumerDebt - consumer);
    const consumerPct = ORIGINAL.consumerDebt > 0 ? consumerPaid / ORIGINAL.consumerDebt * 100 : 0;

    const carPaid = Math.max(0, ORIGINAL.car - data.car);
    const carPct = ORIGINAL.car > 0 ? carPaid / ORIGINAL.car * 100 : 0;
    const savingsPct = ORIGINAL.savingsGoal > 0 ? data.fund / ORIGINAL.savingsGoal * 100 : 0;

    setText("homeConsumerDebt", money0(consumer));
    setText("homeFreedomFund", money0(data.fund));
    setText("homeConsumerPaid", money0(consumerPaid) + " paid off");
    setText("homeCarLoan", money2(data.car));
    setText("homeCarProgress", carPct.toFixed(1) + "% complete · separate");
    setText("homeZipMoneyBalance", money0(data.zipMoney) + " left");
    setText("homeNextDebtMeta", money0(data.zipMoney) + " • Jan 2027");
    setText("homeProgressPercent", consumerPct.toFixed(1) + "%");

    const homeRing = document.getElementById("homeProgressRing");
    if(homeRing){
      const circumference = 2 * Math.PI * 47;
      homeRing.style.strokeDasharray = circumference;
      homeRing.style.strokeDashoffset = circumference * (1 - Math.max(0,Math.min(100,consumerPct))/100);
    }

    const latestNode = document.getElementById("homeLatestUpdate");
    if(latestNode){
      latestNode.textContent = data.updatedAt
        ? "Updated " + new Date(data.updatedAt).toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"})
        : "No progress update saved yet.";
    }
    setText("consumerProgressBadge", consumerPct.toFixed(1) + "% Complete");
    setText("consumerPaidOff", money0(consumerPaid) + " Paid Off");
    setText("consumerProgressMeta", money0(consumer) + " remaining from original " + money2(ORIGINAL.consumerDebt));
    setWidth("consumerProgressBar", consumerPct);

    setText("cc1Debt", money0(data.cc1));
    setText("cc2Debt", money0(data.cc2));
    setText("zipPlusDebt", money0(data.zipPlus));
    setText("zipMoneyDebt", money0(data.zipMoney));

    setText("carDebt", money2(data.car));
    setWidth("carProgressBar", carPct);
    setText("carProgressMeta", money2(carPaid) + " repaid • " + carPct.toFixed(1) + "% complete");

    setText("savingsFreedomFund", money0(data.fund));
    setWidth("savingsProgressBar", savingsPct);

    setText("insightCc1Label", "Credit Card 1 • " + money0(data.cc1));
    setText("insightCc2Label", "Credit Card 2 • " + money0(data.cc2));
    setText("insightZipPlusLabel", "Zip Plus • " + money0(data.zipPlus));
    setText("insightZipMoneyLabel", "Zip Money • " + money0(data.zipMoney));

    document.getElementById("inputFund").value = data.fund;
    document.getElementById("inputCc1").value = data.cc1;
    document.getElementById("inputCc2").value = data.cc2;
    document.getElementById("inputZipPlus").value = data.zipPlus;
    document.getElementById("inputZipMoney").value = data.zipMoney;
    document.getElementById("inputCar").value = data.car;

    const today = new Date().toISOString().slice(0,10);
    document.getElementById("paymentDate").value = today;

    renderHistory();
    renderReport();
  }

  function renderHistory(){
    const list = document.getElementById("historyList");
    if(!data.history || data.history.length === 0){
      list.innerHTML = '<div class="meta">No updates saved yet.</div>';
      return;
    }

    list.innerHTML = data.history.slice().reverse().slice(0, 6).map(entry => {
      const consumer = consumerTotal(entry);
      const date = new Date(entry.date).toLocaleDateString("en-AU",{
        day:"numeric",month:"short",year:"numeric"
      });
      return '<div class="history-entry">' +
        '<div><strong>' + date + '</strong><span>Consumer debt ' + money0(consumer) + '</span></div>' +
        '<div style="text-align:right"><strong>' + money0(entry.fund) + '</strong><span>Freedom Fund</span></div>' +
      '</div>';
    }).join("");
  }

  function renderReport(){
    const box = document.getElementById("progressReport");
    if(!data.latestReport){
      box.innerHTML = '<div class="section-kicker">Latest progress report</div><div class="meta">Save an update to generate your report.</div>';
      return;
    }

    const r = data.latestReport;
    const date = new Date(r.date).toLocaleDateString("en-AU",{
      day:"numeric",month:"long",year:"numeric"
    });

    box.innerHTML =
      '<div class="section-kicker">' + date + ' progress report</div>' +
      '<div class="report-grid">' +
        '<div class="report-item"><span>Consumer debt reduced</span><strong class="report-positive">' + money2(r.consumerReduction) + '</strong></div>' +
        '<div class="report-item"><span>Car loan reduced</span><strong class="report-positive">' + money2(r.carReduction) + '</strong></div>' +
        '<div class="report-item"><span>Freedom Fund added</span><strong class="report-positive">' + money2(r.fundIncrease) + '</strong></div>' +
        '<div class="report-item"><span>Estimated interest</span><strong class="report-neutral">' + money2(r.estimatedInterest) + '</strong></div>' +
        '<div class="report-item"><span>Total payments</span><strong>' + money2(r.totalPayments) + '</strong></div>' +
        '<div class="report-item"><span>Overall position improved</span><strong class="report-positive">' + money2(r.totalImprovement) + '</strong></div>' +
      '</div>' +
      '<div class="meta" style="margin-top:9px">Payment-based balances are estimates. Reconcile with statement balances when available.</div>';
  }

  function snapshot(date){
    return {
      date,
      fund:data.fund,
      cc1:data.cc1,
      cc2:data.cc2,
      zipPlus:data.zipPlus,
      zipMoney:data.zipMoney,
      car:data.car
    };
  }

  function pushHistory(date){
    data.history = Array.isArray(data.history) ? data.history : [];
    data.history.push(snapshot(date));
  }

  document.getElementById("paymentModeButton").addEventListener("click", function(){
    document.getElementById("paymentMode").hidden = false;
    document.getElementById("balanceMode").hidden = true;
    this.classList.add("active");
    document.getElementById("balanceModeButton").classList.remove("active");
  });

  document.getElementById("balanceModeButton").addEventListener("click", function(){
    document.getElementById("paymentMode").hidden = true;
    document.getElementById("balanceMode").hidden = false;
    this.classList.add("active");
    document.getElementById("paymentModeButton").classList.remove("active");
  });

  document.getElementById("applyPayments").addEventListener("click", function(){
    const dateValue = document.getElementById("paymentDate").value || new Date().toISOString().slice(0,10);
    const updateIso = new Date(dateValue + "T12:00:00").toISOString();
    const days = daysBetween(data.updatedAt, updateIso);

    const previous = {...data};

    const payments = {
      fund:Number(document.getElementById("paymentFund").value || 0),
      cc1:Number(document.getElementById("paymentCc1").value || 0),
      cc2:Number(document.getElementById("paymentCc2").value || 0),
      zipPlus:Number(document.getElementById("paymentZipPlus").value || 0),
      zipMoney:Number(document.getElementById("paymentZipMoney").value || 0),
      car:Number(document.getElementById("paymentCar").value || 0)
    };

    const interest = {
      cc1:estimatedInterest(data.cc1,RATES.cc1,days),
      cc2:estimatedInterest(data.cc2,RATES.cc2,days),
      zipPlus:estimatedInterest(data.zipPlus,RATES.zipPlus,days),
      zipMoney:0,
      car:estimatedInterest(data.car,RATES.car,days)
    };

    data.fund = Math.max(0, data.fund + payments.fund);
    data.cc1 = Math.max(0, data.cc1 + interest.cc1 - payments.cc1);
    data.cc2 = Math.max(0, data.cc2 + interest.cc2 - payments.cc2);
    data.zipPlus = Math.max(0, data.zipPlus + interest.zipPlus - payments.zipPlus);
    data.zipMoney = Math.max(0, data.zipMoney - payments.zipMoney);
    data.car = Math.max(0, data.car + interest.car - payments.car);
    data.updatedAt = updateIso;

    const previousConsumer = consumerTotal(previous);
    const newConsumer = consumerTotal(data);
    const consumerReduction = Math.max(0, previousConsumer - newConsumer);
    const carReduction = Math.max(0, previous.car - data.car);
    const fundIncrease = Math.max(0, data.fund - previous.fund);
    const totalPayments = payments.cc1 + payments.cc2 + payments.zipPlus + payments.zipMoney + payments.car;
    const totalInterest = interest.cc1 + interest.cc2 + interest.zipPlus + interest.car;

    data.latestReport = {
      date:updateIso,
      consumerReduction,
      carReduction,
      fundIncrease,
      totalPayments,
      estimatedInterest:totalInterest,
      totalImprovement:consumerReduction + carReduction + fundIncrease
    };

    pushHistory(updateIso);
    save();
    render();

    ["paymentFund","paymentCc1","paymentCc2","paymentZipPlus","paymentZipMoney","paymentCar"].forEach(id => {
      document.getElementById(id).value = 0;
    });

    const status = document.getElementById("paymentStatus");
    status.textContent = "Payments applied. Progress report updated.";
    setTimeout(() => status.textContent = "", 3000);
  });

  document.getElementById("saveBalances").addEventListener("click", function(){
    const previous = {...data};

    data.fund = Number(document.getElementById("inputFund").value || 0);
    data.cc1 = Number(document.getElementById("inputCc1").value || 0);
    data.cc2 = Number(document.getElementById("inputCc2").value || 0);
    data.zipPlus = Number(document.getElementById("inputZipPlus").value || 0);
    data.zipMoney = Number(document.getElementById("inputZipMoney").value || 0);
    data.car = Number(document.getElementById("inputCar").value || 0);
    data.updatedAt = new Date().toISOString();

    const consumerReduction = Math.max(0, consumerTotal(previous) - consumerTotal(data));
    const carReduction = Math.max(0, previous.car - data.car);
    const fundIncrease = Math.max(0, data.fund - previous.fund);

    data.latestReport = {
      date:data.updatedAt,
      consumerReduction,
      carReduction,
      fundIncrease,
      totalPayments:0,
      estimatedInterest:0,
      totalImprovement:consumerReduction + carReduction + fundIncrease
    };

    pushHistory(data.updatedAt);
    save();
    render();

    const status = document.getElementById("saveStatus");
    status.textContent = "Statement balances saved.";
    setTimeout(() => status.textContent = "", 2600);
  });

  document.getElementById("clearHistory").addEventListener("click", function(){
    data.history = [];
    data.latestReport = null;
    save();
    renderHistory();
    renderReport();
  });

  render();
})();

(function(){
  "use strict";

  const FAMILY_KEY = "freedomCountdownFamilyData";

  window.familyMoney = function(value){
    return new Intl.NumberFormat("en-AU",{
      style:"currency",
      currency:"AUD",
      minimumFractionDigits:0,
      maximumFractionDigits:2
    }).format(Number(value || 0));
  };

  window.loadFamilyData = function(){
    try{
      const parsed = JSON.parse(localStorage.getItem(FAMILY_KEY) || "{}");
      return {transactions:Array.isArray(parsed.transactions) ? parsed.transactions : []};
    }catch(error){
      return {transactions:[]};
    }
  };

  window.saveFamilyData = function(data){
    localStorage.setItem(FAMILY_KEY, JSON.stringify(data));
  };

  window.escapeFamilyText = function(value){
    return String(value || "").replace(/[&<>"']/g,function(char){
      return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[char];
    });
  };

  window.renderFamilyCashflow = function(){
    const data = loadFamilyData();
    const now = new Date();
    const monthKey = now.getFullYear() + "-" + String(now.getMonth()+1).padStart(2,"0");
    const monthly = data.transactions.filter(function(tx){
      return tx.date && tx.date.slice(0,7) === monthKey;
    });

    const income = monthly
      .filter(tx => tx.type === "income")
      .reduce((sum,tx) => sum + Number(tx.amount || 0),0);

    const expenses = monthly
      .filter(tx => tx.type === "expense")
      .reduce((sum,tx) => sum + Number(tx.amount || 0),0);

    const balance = income - expenses;

    document.getElementById("familyIncomeTotal").textContent = familyMoney(income);
    document.getElementById("familyExpenseTotal").textContent = familyMoney(expenses);
    document.getElementById("familyBalanceTotal").textContent = familyMoney(balance);
    document.getElementById("familyBalanceTotal").style.color =
      balance < 0 ? "#ef9da5" : "var(--gold-hi)";
    document.getElementById("familyMonthLabel").textContent =
      new Intl.DateTimeFormat("en-AU",{month:"long",year:"numeric"}).format(now);

    const breakdown = document.getElementById("familyCategoryBreakdown");
    const expenseRows = monthly.filter(tx => tx.type === "expense");

    if(expenseRows.length === 0){
      breakdown.innerHTML = '<div class="meta">No expenses recorded yet.</div>';
    }else{
      const totals = {};
      expenseRows.forEach(function(tx){
        totals[tx.category] = (totals[tx.category] || 0) + Number(tx.amount || 0);
      });

      const sorted = Object.entries(totals).sort((a,b) => b[1] - a[1]);
      const maximum = sorted.length ? sorted[0][1] : 0;

      breakdown.innerHTML = sorted.map(function(item){
        const category = item[0];
        const total = item[1];
        const width = maximum > 0 ? total / maximum * 100 : 0;

        return '<div class="category-row">' +
          '<div class="category-info"><strong>' + escapeFamilyText(category) +
          '</strong><span>Family spending</span></div>' +
          '<div class="category-amount">' + familyMoney(total) + '</div>' +
          '<div class="category-bar"><span style="width:' + width + '%"></span></div>' +
        '</div>';
      }).join("");
    }

    const list = document.getElementById("familyTransactionList");

    if(data.transactions.length === 0){
      list.innerHTML = '<div class="meta">No transactions recorded yet.</div>';
    }else{
      list.innerHTML = data.transactions.slice().reverse().slice(0,30).map(function(tx){
        const sign = tx.type === "income" ? "+" : "−";
        const className = tx.type === "income" ? "tx-income" : "tx-expense";
        const dateText = new Date(tx.date + "T12:00:00")
          .toLocaleDateString("en-AU",{day:"numeric",month:"short"});

        return '<div class="family-transaction">' +
          '<div><strong>' + escapeFamilyText(tx.category) + '</strong>' +
          '<small>' + dateText +
          (tx.description ? " · " + escapeFamilyText(tx.description) : "") +
          '</small></div>' +
          '<div class="tx-amount ' + className + '">' + sign + familyMoney(tx.amount) + '</div>' +
          '<button class="delete-transaction" type="button" onclick="deleteFamilyTransaction(\'' +
          tx.id + '\')" aria-label="Delete transaction">×</button>' +
        '</div>';
      }).join("");
    }
  };

  window.addFamilyTransactionNow = function(){
    const typeNode = document.getElementById("familyType");
    const dateNode = document.getElementById("familyDate");
    const categoryNode = document.getElementById("familyCategory");
    const amountNode = document.getElementById("familyAmount");
    const descriptionNode = document.getElementById("familyDescription");
    const status = document.getElementById("familySaveStatus");

    const amount = Number(amountNode.value || 0);

    if(!Number.isFinite(amount) || amount <= 0){
      status.style.color = "#ef9da5";
      status.textContent = "Enter an amount greater than zero.";
      return;
    }

    const data = loadFamilyData();
    data.transactions.push({
      id:Date.now().toString(36) + Math.random().toString(36).slice(2,7),
      type:typeNode.value,
      date:dateNode.value || new Date().toISOString().slice(0,10),
      category:categoryNode.value,
      amount:amount,
      description:descriptionNode.value.trim()
    });

    saveFamilyData(data);
    renderFamilyCashflow();

    amountNode.value = "";
    descriptionNode.value = "";
    status.style.color = "var(--emerald)";
    status.textContent = typeNode.value === "income" ? "Income added." : "Expense added.";

    setTimeout(function(){
      status.textContent = "";
    },2200);
  };

  window.deleteFamilyTransaction = function(id){
    const data = loadFamilyData();
    data.transactions = data.transactions.filter(function(tx){
      return tx.id !== id;
    });
    saveFamilyData(data);
    renderFamilyCashflow();
  };

  window.clearAllFamilyTransactions = function(){
    saveFamilyData({transactions:[]});
    renderFamilyCashflow();
  };

  function updateFamilyType(){
    const type = document.getElementById("familyType").value;
    const category = document.getElementById("familyCategory");
    const button = document.getElementById("addFamilyTransaction");

    button.textContent = type === "income" ? "Add income" : "Add expense";

    if(type === "income" && !["Pay","Bonus","Other"].includes(category.value)){
      category.value = "Pay";
    }
    if(type === "expense" && ["Pay","Bonus"].includes(category.value)){
      category.value = "Groceries";
    }
  }

  document.addEventListener("DOMContentLoaded",function(){
    const dateInput = document.getElementById("familyDate");
    if(dateInput && !dateInput.value){
      dateInput.value = new Date().toISOString().slice(0,10);
    }

    document.getElementById("familyType").addEventListener("change",updateFamilyType);
    document.getElementById("clearFamilyTransactions").onclick = clearAllFamilyTransactions;

    updateFamilyType();
    renderFamilyCashflow();
  });
})();
