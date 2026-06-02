import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const topics = [
  "All Programmes",
  "AI & Society",
  "Cybersecurity",
  "Data Governance",
  "Semiconductor Strategy",
  "Platform Accountability",
  "Digital Rights",
];

const Newsletter = () => {
  const [email, setEmail] = useState("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["All Programmes"]);

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  return (
    <section id="newsletter" className="bg-secondary py-20 lg:py-28">
      <div className="container px-6 lg:px-10">
        <h2 className="font-display text-3xl lg:text-4xl font-normal mb-4">
          Become a <em>Subscriber</em> for&nbsp;…
        </h2>

        <div className="flex flex-wrap gap-2 mt-8 mb-10">
          {topics.map((topic) => (
            <button
              key={topic}
              onClick={() => toggleTopic(topic)}
              className={`px-4 py-2 text-sm font-body border transition-colors ${
                selectedTopics.includes(topic)
                  ? "bg-foreground text-background border-foreground"
                  : "bg-background text-foreground border-border hover:border-foreground"
              }`}
            >
              {topic}
            </button>
          ))}
        </div>

        <p className="text-muted-foreground text-sm mb-6 max-w-lg">
          Receive newsletters and alerts for new publications, expert events, and career opportunities.
        </p>

        <div className="flex gap-3 max-w-md">
          <Input
            type="email"
            placeholder="Your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-background font-body"
          />
          <Button className="font-body font-medium px-6">
            Sign Up
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Newsletter;
