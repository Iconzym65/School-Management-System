<?php

namespace Database\Factories;

use App\Models\Cohort;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Cohort>
 */
class CohortFactory extends Factory
{
    protected $model = Cohort::class;

    public function definition(): array
    {
        $name = 'Vacation Batch '.$this->faker->monthName().' '.$this->faker->year();

        return [
            'name' => $name,
            'code' => 'VAC-'.strtoupper($this->faker->unique()->bothify('???-####')),
            'starts_on' => $this->faker->dateTimeBetween('-1 month', '+2 months')->format('Y-m-d'),
            'ends_on' => $this->faker->dateTimeBetween('+15 days', '+3 months')->format('Y-m-d'),
            'is_active' => false,
        ];
    }
}
