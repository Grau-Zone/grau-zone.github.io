import { motion } from "framer-motion";

const articles = [
  { type: "Policy Brief", title: "Governing Foundation Models in the EU", subtitle: "Balancing innovation and accountability in the AI Act era", date: "April 9, 2026" },
  { type: "Data Brief", title: "Mapping Europe's Cybersecurity Workforce", subtitle: "Skills gaps, talent flows, and strategic priorities", date: "March 28, 2026" },
  { type: "Perspective", title: "Digital Sovereignty Beyond Buzzwords", subtitle: "What self-determination means for Europe's tech stack", date: "March 18, 2026" },
  { type: "Event", title: "Workshop on Responsible AI Procurement", subtitle: undefined, date: "March 15, 2026" },
  { type: "Position Statement", title: "Open-Source AI and National Security", subtitle: "Navigating dual-use risks in transparent systems", date: "March 12, 2026" },
  { type: "News", title: "New Interactive Tool for Chip Supply-Chain Analysis", subtitle: undefined, date: "March 9, 2026" },
];

const LatestResearch = () => {
  return (
    <section className="py-20 lg:py-28">
      <div className="container px-6 lg:px-10">
        <h2 className="font-display text-3xl lg:text-4xl font-normal mb-12">
          Latest Research, Events &amp; News
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article, i) => (
            <motion.a
              key={i}
              href="#"
              className="group block border border-border p-6 hover:bg-accent/50 transition-colors"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
            >
              <span className="text-xs font-body font-medium tracking-wider uppercase text-muted-foreground">
                {article.type}
              </span>
              <h3 className="font-display text-lg font-semibold mt-3 mb-2 group-hover:underline decoration-1 underline-offset-4">
                {article.title}
              </h3>
              {article.subtitle && (
                <p className="text-sm text-muted-foreground font-body leading-relaxed mb-4">
                  {article.subtitle}
                </p>
              )}
              <p className="text-xs text-muted-foreground font-body mt-auto">
                {article.date}
              </p>
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LatestResearch;
