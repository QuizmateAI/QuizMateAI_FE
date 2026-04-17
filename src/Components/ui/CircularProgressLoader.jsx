import React from 'react';

/**
 * CircularProgressLoader - Vòng tròn loading hiển thị phần trăm ở giữa
 * @param {number} percent - Phần trăm (0-100)
 * @param {string} size - Kích thước: 'sm' (w-12), 'md' (w-16), 'lg' (w-20)
 * @param {string} color - Màu: 'blue' (default), 'orange', 'purple', 'amber'
 * @param {string} label - Nhãn hiển thị bên dưới (ví dụ: "Loading", "Processing")
 * @param {string} className - Class CSS bổ sung
 */
export default function CircularProgressLoader({
	percent = 0,
	size = 'md',
	color = 'blue',
	label = '',
	className = '',
}) {
	const sizeMap = {
		sm: { container: 'w-12 h-12', text: 'text-[13px]' },
		md: { container: 'w-16 h-16', text: 'text-[15px]' },
		lg: { container: 'w-20 h-20', text: 'text-[18px]' },
	};

	const colorMap = {
		blue: 'text-blue-600 dark:text-blue-400',
		orange: 'text-orange-500 dark:text-orange-400',
		purple: 'text-purple-500 dark:text-purple-400',
		amber: 'text-amber-500 dark:text-amber-400',
		green: 'text-green-500 dark:text-green-400',
		red: 'text-red-500 dark:text-red-400',
	};

	const dims = sizeMap[size] || sizeMap.md;
	const colorClass = colorMap[color] || colorMap.blue;
	const normalizedPercent = Math.max(0, Math.min(100, Number(percent) || 0));
	const displayPercent = Math.round(normalizedPercent);

	// Tính circumference đúng: r = 45 (trong SVG 100x100 viewBox)
	// C = 2πr = 2π(45) ≈ 282.74
	const circumference = 282.74;
	const strokeDashoffset = circumference - (normalizedPercent / 100) * circumference;

	return (
		<div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
			<div className={`relative ${dims.container}`}>
				<svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
					{/* Background circle */}
					<circle
						cx="50"
						cy="50"
						r="45"
						fill="none"
						stroke="currentColor"
						strokeWidth="3"
						className="text-blue-100 dark:text-blue-900"
					/>
					{/* Progress circle */}
					<circle
						cx="50"
						cy="50"
						r="45"
						fill="none"
						stroke="currentColor"
						strokeWidth="3"
						strokeDasharray={circumference}
						strokeDashoffset={strokeDashoffset}
						strokeLinecap="round"
						className={`${colorClass} transition-all duration-500`}
					/>
				</svg>

				{/* Center content - Chỉ hiển thị phần trăm để rõ ràng */}
				<div className="absolute inset-0 flex items-center justify-center">
					<div className={`${dims.text} font-bold leading-none tabular-nums ${colorClass}`}>
						{displayPercent}%
					</div>
				</div>
			</div>

			{/* Label */}
			{label && (
				<p className="text-xs text-blue-500 dark:text-blue-400 text-center max-w-xs line-clamp-2">
					{label}
				</p>
			)}
		</div>
	);
}
