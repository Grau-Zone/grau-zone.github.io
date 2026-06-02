import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const programmes = [
  "Artificial Intelligence & Society",
  "Cybersecurity & Resilience",
  "Data Governance",
  "Digital Rights & Democracy",
  "Semiconductor Strategy",
  "Platform Accountability",
];

const Programmes = () => {
  return (
    <section className="py-20 lg:py-28">
      <div className="container px-6 lg:px-10">
        <h2 className="font-display text-3xl lg:text-4xl font-normal mb-12">
          Our Programmes
        </h2>
        <div className="border-t border-border">
          {programmes.map((name, i) => (
            <motion.a
              key={name}
              href="#"
              className="group flex items-center justify-between py-5 border-b border-border hover:bg-accent/50 transition-colors px-2 -mx-2"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <span className="font-display text-xl lg:text-2xl font-normal">
                {name}
              </span>
              <ArrowRight className="w-5 h-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.a>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Programmes;
