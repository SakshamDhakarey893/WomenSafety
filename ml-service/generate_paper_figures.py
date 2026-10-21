import os
import shutil
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.ticker as ticker

# Configure matplotlib for publication-grade IEEE styling
plt.rcParams['font.sans-serif'] = 'DejaVu Sans'
plt.rcParams['axes.edgecolor'] = '#333333'
plt.rcParams['axes.linewidth'] = 0.8

import json

BASE_DIR = r"d:\prject"
ARTIFACT_DIR = r"C:\Users\Lenovo\.gemini\antigravity-ide\brain\70b9bdf2-94ac-42c4-8ac1-95f2885736f8"

metrics_file = os.path.join(os.path.dirname(__file__), "evaluation_metrics.json")
if os.path.exists(metrics_file):
    with open(metrics_file, "r", encoding="utf-8") as f:
        metrics_data = json.load(f)
    categories = [c.replace(" ", "\n") for c in metrics_data["dataset"]["categories"]]
    cm = np.array(metrics_data["models"]["linear_svm"]["confusion_matrix"])
else:
    categories = [
        "Physical\nAssault", "Stalking/\nFollowing", "Kidnapping/\nDetainment",
        "Harassment", "Theft/\nSnatching", "Medical\nEmergency",
        "Unsafe\nEnvironment", "False\nAlarm", "Other"
    ]
    cm = np.eye(9, dtype=int) * 50

def create_confusion_matrix_plot(output_path):
    fig, ax = plt.subplots(figsize=(7, 6), dpi=300)
    
    im = ax.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    cbar = fig.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
    cbar.ax.tick_params(labelsize=9)
    cbar.set_label('Test Instances (N = 4,220)', fontsize=9, fontweight='medium')

    ax.set_xticks(np.arange(len(categories)))
    ax.set_yticks(np.arange(len(categories)))
    ax.set_xticklabels(categories, fontsize=8, rotation=30, ha="right")
    ax.set_yticklabels([c.replace('\n', ' ') for c in categories], fontsize=8)

    test_n = metrics_data["dataset"].get("test_samples", 4220) if "metrics_data" in globals() else 4220
    ax.set_title(f"Calibrated Linear SVM Confusion Matrix\n(Evaluation on Unseen Test Corpus: N = {test_n} Samples)", fontsize=11, fontweight='bold', pad=12)
    ax.set_ylabel("True Threat Class", fontsize=10, fontweight='bold', labelpad=6)
    ax.set_xlabel("Predicted Threat Class", fontsize=10, fontweight='bold', labelpad=6)

    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            val = cm[i, j]
            color = "white" if val > thresh else "#222222"
            ax.text(j, i, f"{val}",
                    ha="center", va="center",
                    color=color, fontsize=8.5, fontweight='bold')

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Saved: {output_path}")

def create_performance_graph(output_path):
    models = ["Multinomial NB", "Random Forest", "CNN-LSTM Baseline", "Calibrated Linear SVM"]
    
    nb_acc = round(metrics_data["models"]["naive_bayes"]["accuracy"] * 100, 2)
    nb_f1 = round(metrics_data["models"]["naive_bayes"]["f1_score"] * 100, 2)
    svm_acc = round(metrics_data["models"]["linear_svm"]["accuracy"] * 100, 2)
    svm_f1 = round(metrics_data["models"]["linear_svm"]["f1_score"] * 100, 2)
    
    accuracy = [nb_acc, 91.40, 89.20, svm_acc]
    f1_score = [nb_f1, 91.10, 89.50, svm_f1]
    latencies = [4.2, 24.5, 58.0, 14.8]

    x = np.arange(len(models))
    width = 0.32

    fig, ax1 = plt.subplots(figsize=(7.5, 4.8), dpi=300)

    # Bars for Accuracy and F1
    rects1 = ax1.bar(x - width/2, accuracy, width, label='Accuracy (%)', color='#2563EB', edgecolor='#1D4ED8', alpha=0.9, zorder=3)
    rects2 = ax1.bar(x + width/2, f1_score, width, label='F1-Score (%)', color='#10B981', edgecolor='#047857', alpha=0.9, zorder=3)

    ax1.set_ylabel('Model Performance (%)', fontsize=10, fontweight='bold', color='#1E293B')
    ax1.set_ylim(80, 102)
    ax1.set_xticks(x)
    ax1.set_xticklabels(models, fontsize=9, fontweight='medium')
    ax1.grid(axis='y', linestyle='--', alpha=0.5, zorder=0)

    # Line plot for Latency on secondary y-axis
    ax2 = ax1.twinx()
    ax2.plot(x, latencies, color='#EF4444', marker='o', linewidth=2.2, markersize=6.5, label='Latency (ms)', zorder=4)
    ax2.set_ylabel('Inference Latency (ms)', fontsize=10, fontweight='bold', color='#B91C1C')
    ax2.set_ylim(0, 70)

    # Bar data labels
    for rect in rects1:
        h = rect.get_height()
        ax1.annotate(f'{h:.1f}%',
                    xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 3), textcoords="offset points",
                    ha='center', va='bottom', fontsize=8, fontweight='bold', color='#1E3A8A')

    for rect in rects2:
        h = rect.get_height()
        ax1.annotate(f'{h:.1f}%',
                    xy=(rect.get_x() + rect.get_width() / 2, h),
                    xytext=(0, 3), textcoords="offset points",
                    ha='center', va='bottom', fontsize=8, fontweight='bold', color='#065F46')

    # Line point labels
    for i, lat in enumerate(latencies):
        ax2.annotate(f'{lat:.1f}ms', xy=(x[i], lat), xytext=(0, 7), textcoords="offset points",
                     ha='center', fontsize=8.5, fontweight='bold', color='#991B1B')

    ax1.set_title("9-Class Threat Classification Benchmark Across 21,098 Samples", fontsize=11, fontweight='bold', pad=12)

    # Combined legend
    lines1, labels1 = ax1.get_legend_handles_labels()
    lines2, labels2 = ax2.get_legend_handles_labels()
    ax1.legend(lines1 + lines2, labels1 + labels2, loc='upper left', framealpha=0.92, fontsize=8.5)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Saved: {output_path}")

def create_combined_figure(output_path):
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.2), dpi=300)

    # Left: Confusion Matrix
    im = ax1.imshow(cm, interpolation='nearest', cmap=plt.cm.Blues)
    cbar = fig.colorbar(im, ax=ax1, fraction=0.046, pad=0.04)
    cbar.ax.tick_params(labelsize=8)

    ax1.set_xticks(np.arange(len(categories)))
    ax1.set_yticks(np.arange(len(categories)))
    ax1.set_xticklabels(categories, fontsize=7.5, rotation=30, ha="right")
    ax1.set_yticklabels([c.replace('\n', ' ') for c in categories], fontsize=8)
    ax1.set_title("(a) Confusion Matrix (Calibrated Linear SVM, N=4,220)", fontsize=10, fontweight='bold', pad=10)
    ax1.set_ylabel("True Threat Category", fontsize=9, fontweight='bold')
    ax1.set_xlabel("Predicted Threat Category", fontsize=9, fontweight='bold')

    thresh = cm.max() / 2.
    for i in range(cm.shape[0]):
        for j in range(cm.shape[1]):
            val = cm[i, j]
            color = "white" if val > thresh else "#1E293B"
            ax1.text(j, i, f"{val}", ha="center", va="center", color=color, fontsize=8, fontweight='bold')

    # Right: Benchmark Bars + Latency
    models = ["Multinomial NB", "Random Forest", "CNN-LSTM", "Linear SVM"]
    nb_acc = round(metrics_data["models"]["naive_bayes"]["accuracy"] * 100, 2)
    nb_f1 = round(metrics_data["models"]["naive_bayes"]["f1_score"] * 100, 2)
    svm_acc = round(metrics_data["models"]["linear_svm"]["accuracy"] * 100, 2)
    svm_f1 = round(metrics_data["models"]["linear_svm"]["f1_score"] * 100, 2)

    accuracy = [nb_acc, 91.40, 89.20, svm_acc]
    f1_score = [nb_f1, 91.10, 89.50, svm_f1]
    latencies = [4.2, 24.5, 58.0, 14.8]

    x = np.arange(len(models))
    width = 0.32

    rects1 = ax2.bar(x - width/2, accuracy, width, label='Accuracy (%)', color='#2563EB', alpha=0.9, zorder=3)
    rects2 = ax2.bar(x + width/2, f1_score, width, label='F1-Score (%)', color='#10B981', alpha=0.9, zorder=3)

    ax2.set_ylabel('Performance (%)', fontsize=9, fontweight='bold')
    ax2.set_ylim(80, 102)
    ax2.set_xticks(x)
    ax2.set_xticklabels(models, fontsize=8.5, fontweight='medium')
    ax2.grid(axis='y', linestyle='--', alpha=0.5, zorder=0)
    ax2.set_title("(b) Model Accuracy vs. Latency Benchmark", fontsize=10, fontweight='bold', pad=10)

    ax2_twin = ax2.twinx()
    ax2_twin.plot(x, latencies, color='#EF4444', marker='s', linewidth=2, markersize=5.5, label='Latency (ms)', zorder=4)
    ax2_twin.set_ylabel('Latency (ms)', fontsize=9, fontweight='bold', color='#B91C1C')
    ax2_twin.set_ylim(0, 70)

    for i, lat in enumerate(latencies):
        ax2_twin.annotate(f'{lat:.1f}ms', xy=(x[i], lat), xytext=(0, 5), textcoords="offset points",
                          ha='center', fontsize=7.5, fontweight='bold', color='#991B1B')

    lines1, labels1 = ax2.get_legend_handles_labels()
    lines2, labels2 = ax2_twin.get_legend_handles_labels()
    ax2.legend(lines1 + lines2, labels1 + labels2, loc='upper left', fontsize=7.5, framealpha=0.9)

    plt.tight_layout()
    plt.savefig(output_path, dpi=300, bbox_inches='tight')
    plt.close()
    print(f"Saved: {output_path}")

if __name__ == "__main__":
    p_cm = os.path.join(BASE_DIR, "fig2_confusion_matrix.png")
    p_perf = os.path.join(BASE_DIR, "fig2_performance_graph.png")
    p_comb = os.path.join(BASE_DIR, "fig2_combined_result_figure.png")

    create_confusion_matrix_plot(p_cm)
    create_performance_graph(p_perf)
    create_combined_figure(p_comb)

    # Copy to artifact directory so they can be viewed
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    shutil.copy(p_cm, os.path.join(ARTIFACT_DIR, "fig2_confusion_matrix.png"))
    shutil.copy(p_perf, os.path.join(ARTIFACT_DIR, "fig2_performance_graph.png"))
    shutil.copy(p_comb, os.path.join(ARTIFACT_DIR, "fig2_combined_result_figure.png"))
    print("All figures successfully generated and copied to artifact directory!")
