import styles from "./MetricCard.module.css";

export default function MetricCard({ label, value, detail, icon, tone = "orange", dark = false, onClick }) {
  const Tag = onClick ? "button" : "article";
  return (
    <Tag
      className={`${styles.card} ${dark ? styles.dark : styles.light}`}
      style={{ "--metric-accent": tone === "blue" ? "#39b7ff" : tone === "green" ? "#40d9a0" : "#ff773d" }}
      {...(onClick ? { type: "button", onClick, "aria-haspopup": "dialog" } : {})}
    >
      <span className={styles.icon} aria-hidden="true">{icon}</span>
      <span className={styles.content}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
        <span className={styles.detail}>{detail}</span>
      </span>
    </Tag>
  );
}
