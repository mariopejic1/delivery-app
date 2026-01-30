// potvrda brisanja
document.querySelectorAll(".confirm").forEach(btn => {
  btn.addEventListener("click", e => {
    if (!confirm("Jeste li sigurni?")) e.preventDefault();
  });
});

// simulacija kartičnog plaćanja
const payment = document.querySelector("#payment");

if (payment) {
  payment.addEventListener("change", () => {
    if (payment.value === "Card") {
      alert("Simulacija kartičnog plaćanja uspješna ✅");
    }
  });
}
