const experts = [
  { name: "Dr. Elena Richter", role: "Lead, AI & Society Programme", initials: "ER" },
  { name: "Marcus Andersen", role: "Senior Researcher, Cybersecurity", initials: "MA" },
  { name: "Dr. Sophie Laurent", role: "Lead, Digital Rights & Democracy", initials: "SL" },
  { name: "Kenji Watanabe", role: "Lead, Semiconductor Strategy", initials: "KW" },
];

const Experts = () => {
  return (
    <section className="bg-secondary py-20 lg:py-28">
      <div className="container px-6 lg:px-10">
        <div className="flex items-center justify-between mb-12">
          <h2 className="font-display text-3xl lg:text-4xl font-normal">Our Experts</h2>
          <a href="#" className="text-sm font-body font-medium underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors">
            Show all
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {experts.map((expert) => (
            <a key={expert.name} href="#" className="group block">
              <div className="aspect-[3/4] bg-muted flex items-center justify-center mb-4 overflow-hidden">
                <span className="font-display text-4xl text-muted-foreground/40">{expert.initials}</span>
              </div>
              <h3 className="font-display text-lg font-semibold group-hover:underline decoration-1 underline-offset-4">
                {expert.name}
              </h3>
              <p className="text-sm text-muted-foreground font-body mt-1">
                {expert.role}
              </p>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Experts;
